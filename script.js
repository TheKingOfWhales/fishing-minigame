const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let catchProgress = 0;
const maxProgress = 100;
let caught = false;
let gamePaused = false;
let message = "";
let messageTimer = 0;
let fishPull = 0;
let startedCatching = false;
let lost = false;
let bounceStartTime = 0;
let bounceDuration = 1000; // in ms, total bounce length
let bouncing = false;
let sparkles = [];
let playerMoney = 0;
let rodLevel = 1;
let baitLevel = 1;
let currentZone = "pond";
let baseFish;
let currentFish;
let isFishing = false;
let showingNothingMessage = false; // NEW: Track if we're showing "nothing biting"

const fishList = [
    {
        name: "Common Carp",
        zone: "pond",
        requiredBaitLevel: 1,
        pullStrength: 0.8,
        catchZoneWidth: 90,
        behavior: "steady",
        baseValue: 10,
        minWeight: 1.0,
        maxWeight: 3.0
    },
    {
        name: "Silver Salmon",
        zone: "pond",
        requiredBaitLevel: 3,
        pullStrength: 1.7,
        catchZoneWidth: 65,
        behavior: "wiggle",
        baseValue: 15,
        minWeight: 1.5,
        maxWeight: 4.0
    },
    {
        name: "Electric Eel",
        zone: "ocean",
        requiredBaitLevel: 20,
        pullStrength: 2.5,
        catchZoneWidth: 40,
        behavior: "random",
        baseValue: 30,
        minWeight: 1.0,
        maxWeight: 6.0
    },
    {
        name: "Driftfish",
        zone: "pond",
        requiredBaitLevel: 6,
        pullStrength: 5,
        catchZoneWidth: 75,
        behavior: "drifty",
        baseValue: 15,
        minWeight: 1.0,
        maxWeight: 2.0
    },
    {
        name: "Spiketail",
        zone: "ocean",
        requiredBaitLevel: 1,
        pullStrength: 2.2,
        catchZoneWidth: 50,
        behavior: "pulse",
        baseValue: 20,
        minWeight: 5.0,
        maxWeight: 15.0
    },
    {
        name: "Frostfin",
        zone: "arctic",
        requiredBaitLevel: 30,
        pullStrength: 3.0,
        catchZoneWidth: 35,
        behavior: "random",
        baseValue: 50,
        minWeight: 2.0,
        maxWeight: 8.0
    },
    {
        name: "Voidcrawler",
        zone: "abyss",
        requiredBaitLevel: 50,
        pullStrength: 4.0,
        catchZoneWidth: 25,
        behavior: "pulse",
        baseValue: 100,
        minWeight: 10.0,
        maxWeight: 25.0
    }
];

const zones = {
    pond: {
        name: "Pond",
        color: "#446644", // greenish
        canvasColor: "#4466aa", // water area (cool blue)
        unlocked: true
    },
    ocean: {
        name: "Ocean",
        color: "#3355aa", // blue
        canvasColor: "#3399ff", // tropical blue
        unlocked: false,
        cost: 10
    },
    abyss: {
        name: "Abyss",
        color: "#111133", // deep blue
        canvasColor: "#221144", // deep purplish blue
        unlocked: false,
        cost: 25
    },
    arctic: {
        name: "Arctic",
        color: "#e0e8f0", // icy white-blue
        canvasColor: "#66aaff", // icy blue
        unlocked: false,
        cost: 50
    }
};

let targetBgColor = zones[currentZone].color;
let bgColor = targetBgColor; // used for smooth transition

const lures = {
    cork: {
        name: "Cork",
        description: "+10% Catch Zone Size",
        cost: 10,
        unlocked: false,
        active: false
    },
    goldHook: {
        name: "Gold Hook",
        description: "+20% Fish Value",
        cost: 10,
        unlocked: false,
        active: false
    },
    juicyBait: {
        name: "Juicy Bait",
        description: "+2 Bait Level (temp)",
        cost: 20,
        unlocked: false,
        active: false
    }
};

const rarities = [
    { name: "Common", multiplier: 1.0, chance: 0.6 },
    { name: "Uncommon", multiplier: 1.5, chance: 0.25 },
    { name: "Rare", multiplier: 2.5, chance: 0.1 },
    { name: "Epic", multiplier: 4.0, chance: 0.04 },
    { name: "Legendary", multiplier: 7.0, chance: 0.01 }
];

const raritySparkleSettings = {
    "Common": { count: 10, color: "#aaaaaa", size: [2, 4] },
    "Uncommon": { count: 15, color: "#66cc66", size: [3, 5] },
    "Rare": { count: 20, color: "#3399ff", size: [4, 6] },
    "Epic": { count: 30, color: "#a259ff", size: [5, 8] },
    "Legendary": { count: 45, color: "#ffaa00", size: [6, 10] }
};

// Bar dimensions
const bar = {
    x: 100,
    y: 100,
    width: 600,
    height: 20
};

// Catch zone (randomized within bar)
const catchZone = {
    width: 100,
    x: Math.random() * (bar.width - 100) + bar.x,
    y: bar.y
};

// Circle (player-controlled)
let circle = {
    x: bar.x + bar.width / 2,
    y: bar.y + bar.height / 2,
    radius: 15,
    speed: 0
};

function drawBar() {
    ctx.fillStyle = "#333";
    ctx.fillRect(bar.x, bar.y, bar.width, bar.height);
}

function drawCatchZone() {
    ctx.fillStyle = "#66ff66";
    ctx.fillRect(catchZone.x, catchZone.y, catchZone.width, bar.height);
}

function drawCircle() {
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ff6666";
    ctx.fill();
    ctx.closePath();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Interpolate background color
    function lerpColor(a, b, t) {
        const ah = parseInt(a.replace("#", ""), 16);
        const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;

        const bh = parseInt(b.replace("#", ""), 16);
        const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;

        const rr = Math.round(ar + t * (br - ar));
        const rg = Math.round(ag + t * (bg - ag));
        const rb = Math.round(ab + t * (bb - ab));

        return `rgb(${rr},${rg},${rb})`;
    }

    // Animate background fade
    bgColor = lerpColor(bgColor, targetBgColor, 0.05);
    ctx.fillStyle = zones[currentZone].canvasColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Only run game logic if we have a fish and aren't showing a message
    if (currentFish && !gamePaused && !showingNothingMessage) {
        // Update circle movement
        circle.x += circle.speed + fishPull;
        circle.speed *= 0.9;

        // Clamp circle inside bar
        const minX = bar.x + circle.radius;
        const maxX = bar.x + bar.width - circle.radius;
        circle.x = Math.max(minX, Math.min(circle.x, maxX));

        // Check if circle is inside catch zone
        if (
            circle.x > catchZone.x &&
            circle.x < catchZone.x + catchZone.width
        ) {
            if (!startedCatching) startedCatching = true;
            catchProgress += 1;

            if (catchProgress >= maxProgress && !caught) {
                caught = true;
                gamePaused = true; // 🔒 freeze time
                showCatchMessage(currentFish);
                messageTimer = 120;
                createSparkles(currentFish.rarity); // Add sparkles when caught
            }
        } else {
            if (startedCatching) {
                catchProgress -= 0.5;

                if (catchProgress <= 0 && !caught && !lost) {
                    lost = true;
                    gamePaused = true; // 🔒 freeze time
                    message = "The fish got away! 💨🐟";
                    messageTimer = 120;
                }
            }
        }

        // Clamp progress between 0 and max
        catchProgress = Math.max(0, Math.min(catchProgress, maxProgress));

        drawBar();
        drawCatchZone();
        drawCircle();
        drawProgressBar();
    }
    // If we're fishing but have no fish, or showing nothing message, just show the water
    else if (isFishing && !currentFish) {
        // Don't draw game elements, just water background
    }

    updateAndDrawSparkles(); // Draw sparkles

    // Show message if fish caught or other messages
    if (messageTimer > 0) {
        if (!bouncing) {
            bounceStartTime = performance.now();
            bouncing = true;
        }

        ctx.font = "32px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;

        const lines = message.split("\n");
        const lineHeight = 40;

        // Calculate elapsed time since bounce started
        const elapsed = performance.now() - bounceStartTime;

        // Bounce easing: simple easeOutBounce effect
        function easeOutBounce(x) {
            const n1 = 7.5625;
            const d1 = 2.75;
            if (x < 1 / d1) {
                return n1 * x * x;
            } else if (x < 2 / d1) {
                return n1 * (x -= 1.5 / d1) * x + 0.75;
            } else if (x < 2.5 / d1) {
                return n1 * (x -= 2.25 / d1) * x + 0.9375;
            } else {
                return n1 * (x -= 2.625 / d1) * x + 0.984375;
            }
        }

        // Normalize elapsed time to 0..1 for easing function
        let t = Math.min(elapsed / bounceDuration, 1);
        let bounce = easeOutBounce(t) * 30; // 30 px max bounce height

        // Invert bounce so text starts low and bounces up/down
        bounce = 30 - bounce;

        const startY = canvas.height / 2 - (lines.length * lineHeight) / 2 + bounce;

        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], canvas.width / 2, startY + i * lineHeight);
        }

        ctx.shadowBlur = 0;
        messageTimer--;

        if (messageTimer === 0) {
            bouncing = false;
            gamePaused = false;
            showingNothingMessage = false; // Reset the flag

            // Only continue fishing if we were actually fishing
            if (isFishing && !caught && !lost) {
                resetCatch(); // Try to find another fish
            } else {
                // Stop fishing if we caught something or lost
                isFishing = false;
                resetGameState();
            }
        }
    }

    // Display current status
    const padding = 10;
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.textAlign = "left";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;

    let statusText = "";
    if (!isFishing) {
        statusText = "Not fishing - Click 'Cast Line' to start!";
    } else if (showingNothingMessage) {
        statusText = "Waiting...";
    } else if (currentFish) {
        statusText = `Fishing: ${currentFish.name}`;
    } else {
        statusText = "Casting line...";
    }

    ctx.fillText(statusText, padding, padding + 20);
    // Reset shadow so it doesn't affect other elements later
    ctx.shadowBlur = 0;
}

function createSparkles(rarity) {
    const setting = raritySparkleSettings[rarity] || raritySparkleSettings["Common"];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let i = 0; i < setting.count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 1 + 0.5;
        const size = Math.random() * (setting.size[1] - setting.size[0]) + setting.size[0];

        sparkles.push({
            x: centerX,
            y: centerY,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed - 0.5,
            size: size,
            alpha: 1,
            color: setting.color,
            life: 100
        });
    }
}

function updateAndDrawSparkles() {
    for (let i = sparkles.length - 1; i >= 0; i--) {
        const s = sparkles[i];
        s.x += s.dx;
        s.y += s.dy;
        s.alpha -= 0.01;
        s.life--;

        if (s.alpha <= 0 || s.life <= 0) {
            sparkles.splice(i, 1);
            continue;
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `${s.color}${Math.floor(s.alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.fill();
    }
}

function drawProgressBar() {
    const barWidth = 300;
    const barHeight = 20;
    const x = canvas.width / 2 - barWidth / 2;
    const y = canvas.height - 50;

    ctx.fillStyle = "#ccc";
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#00cc66";
    const fillWidth = (catchProgress / maxProgress) * barWidth;
    ctx.fillRect(x, y, fillWidth, barHeight);

    ctx.strokeStyle = "#000";
    ctx.strokeRect(x, y, barWidth, barHeight);
}

// Left click = move left
// Right click = move right
window.addEventListener("mousedown", (e) => {
    if (gamePaused || !currentFish) return;

    if (e.button === 0) {
        // Left mouse button
        circle.speed -= 3;
    } else if (e.button === 2) {
        // Right mouse button
        circle.speed += 3;
    }
});

// Prevent right-click menu from popping up
window.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

function resetGameState() {
    caught = false;
    lost = false;
    startedCatching = false;
    catchProgress = 0;
    message = "";
    messageTimer = 0;
    currentFish = null;
    showingNothingMessage = false;
    gamePaused = false;

    // Reset circle to center
    circle.x = bar.x + bar.width / 2;
    circle.speed = 0;
    fishPull = 0;
}

function resetCatch() {
    // Don't reset if not fishing
    if (!isFishing) return;

    // Reset game state first
    caught = false;
    lost = false;
    startedCatching = false;
    catchProgress = 0;
    message = "";
    currentFish = null;

    let effectiveBaitLevel = baitLevel;
    // FIXED: Changed from 'juicybait' to 'juicyBait'
    if (lures.juicyBait.active) effectiveBaitLevel += 2;

    // Pick a random fish
    const availableFish = fishList.filter(f =>
        f.zone === currentZone && effectiveBaitLevel >= (f.requiredBaitLevel || 1)
    );

    if (availableFish.length === 0) {
        // Show "nothing biting" message and stop trying to fish
        showingNothingMessage = true;
        gamePaused = true;
        message = `Nothing seems to be biting in the ${zones[currentZone].name}...\nTry upgrading your bait or switching zones!`;
        messageTimer = 180; // Show for 3 seconds
        return;
    }

    baseFish = availableFish[Math.floor(Math.random() * availableFish.length)];
    currentFish = prepareCaughtFish(baseFish);

    let catchZoneMultiplier = 1 + rodLevel * 0.1;
    if (lures.cork.active) catchZoneMultiplier += 0.1;
    catchZone.width = currentFish.catchZoneWidth * catchZoneMultiplier;

    // Randomize catch zone position
    catchZone.x = Math.random() * (bar.width - catchZone.width) + bar.x;

    // Reset circle to center
    circle.x = bar.x + bar.width / 2;
    circle.speed = 0;
    fishPull = 0;

    updateShopDisplay();
}

function updateFishPull() {
    if (gamePaused || !currentFish) return;

    switch (currentFish.behavior) {
        case "steady":
            // Gentle constant pull left or right
            fishPull = currentFish.pullStrength * (Math.random() < 0.5 ? -1 : 1);
            break;

        case "wiggle":
            // Random but small jitter, kind of like a struggling fish
            fishPull = (Math.random() - 0.5) * currentFish.pullStrength * 1.2;
            break;

        case "random":
            // Spikes of force, very unpredictable
            fishPull = (Math.random() - 0.5) * currentFish.pullStrength * 4;
            break;

        case "pulse":
            // A tug every few seconds (e.g. once every 2 seconds)
            if (Math.random() < 0.1) {
                fishPull = (Math.random() < 0.5 ? -1 : 1) * currentFish.pullStrength * 2;
            } else {
                fishPull = 0;
            }
            break;

        case "drifty":
            // Slow drift that changes direction over time
            if (!currentFish._drift) {
                currentFish._drift = { dir: Math.random() < 0.5 ? -1 : 1, timer: 0 };
            }
            currentFish._drift.timer++;
            if (currentFish._drift.timer > 60) {
                currentFish._drift.dir *= -1;
                currentFish._drift.timer = 0;
            }
            fishPull = currentFish.pullStrength * 0.4 * currentFish._drift.dir;
            break;

        default:
            // Fallback to jitter
            fishPull = (Math.random() - 0.5) * currentFish.pullStrength * 2;
    }
}

function getRandomRarity() {
    const adjustedRarities = rarities.map(r => {
        let bonus = baitLevel * 0.005; // 0.5% bonus per bait level
        return {
            ...r,
            adjustedChance: r.chance + (r.name !== "Common" ? bonus : -bonus * 2)
        };
    });

    const total = adjustedRarities.reduce((sum, r) => sum + r.adjustedChance, 0);
    const roll = Math.random() * total;
    let cumulative = 0;

    for (let r of adjustedRarities) {
        cumulative += r.adjustedChance;
        if (roll < cumulative) return r;
    }

    return rarities[0]; // fallback
}

function showCatchMessage(fish) {
    message = `Caught a ${fish.rarity} ${fish.name}!\n` +
        `Weight: ${fish.weight} kg\n` +
        `Value: $${fish.finalValue}`;
    messageTimer = 180; // Show message for 3 seconds
    playerMoney += fish.finalValue;
    updateMoneyDisplay();
}

function prepareCaughtFish(baseFish) {
    const rarity = getRandomRarity();
    const weight = getRandomWeight(baseFish.minWeight, baseFish.maxWeight);
    const weightMultiplier = weight / baseFish.minWeight; // baseline boost
    let value = baseFish.baseValue * rarity.multiplier * weightMultiplier;
    // FIXED: Changed from 'goldhook' to 'goldHook'
    if (lures.goldHook.active) value *= 1.2;
    value = Math.floor(value);

    return {
        ...baseFish,
        rarity: rarity.name,
        rarityMultiplier: rarity.multiplier,
        weight: weight,
        weightMultiplier: weightMultiplier,
        finalValue: value
    };
}

function getRandomWeight(min, max) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function updateMoneyDisplay() {
    document.getElementById("moneyDisplay").textContent = `💵 $${playerMoney}`;
}

function buyRod() {
    const cost = getRodCost(rodLevel);
    if (playerMoney >= cost) {
        playerMoney -= cost;
        rodLevel++;
        updateMoneyDisplay();
        updateShopDisplay();
    } else {
        alert(`Need $${cost} for next rod upgrade.`);
    }
}

function buyBait() {
    const cost = getBaitCost(baitLevel);
    if (playerMoney >= cost) {
        playerMoney -= cost;
        baitLevel++;
        updateMoneyDisplay();
        updateShopDisplay();
    } else {
        alert(`Need $${cost} for next bait upgrade.`);
    }
}

function updateShopDisplay() {
    document.getElementById("rodLevel").textContent = rodLevel;
    document.getElementById("baitLevel").textContent = baitLevel;
    document.getElementById("rodCost").textContent = getRodCost(rodLevel);
    document.getElementById("baitCost").textContent = getBaitCost(baitLevel);
}

function getRodCost(level) {
    return Math.pow(2, level - 1) * 100;
}

function getBaitCost(level) {
    return Math.pow(2, level - 1) * 50;
}

function changeZone(zone) {
    if (!zones[zone].unlocked) {
        alert("This zone is locked! Purchase it in the upgrades panel.");
        return;
    }

    currentZone = zone;
    targetBgColor = zones[zone].color; // Update target color for smooth transition
    document.body.style.backgroundColor = zones[zone].color;

    // Update title color based on zone
    const title = document.querySelector('h1');
    title.className = zone; // Set the class to match the zone name

    // Properly reset all game state when switching zones
    isFishing = false;
    resetGameState();

    updateMoneyDisplay();
    updateShopDisplay();
}

function castLine() {
    // Reset everything and start fishing
    resetGameState();
    isFishing = true;
    resetCatch(); // This will find a fish or show "nothing biting"
}

const upgradeToggle = document.getElementById("upgradeToggle");
const upgradePanel = document.getElementById("upgradePanel");

function toggleUpgradePanel() {
    upgradePanel.style.display = upgradePanel.style.display === "flex" ? "none" : "flex";
    renderUpgrades(); // Update the display when opened
}

function renderUpgrades() {
    const row = document.getElementById("upgradeItemsRow");
    row.innerHTML = "";

    // ✅ ZONE CARDS
    Object.keys(zones).forEach(zoneKey => {
        const zone = zones[zoneKey];
        const div = document.createElement("div");
        div.className = "upgradeCard";

        if (zone.unlocked) {
            div.innerHTML = `<strong>${zone.name}</strong><br>✅ Unlocked`;
            div.style.background = "#333";
            div.style.cursor = "default";
        } else {
            div.innerHTML = `<strong>${zone.name}</strong><br>$${zone.cost.toLocaleString()}<br><small>Click to unlock</small>`;
            div.onclick = () => tryUnlockZone(zoneKey);
            div.style.cursor = "pointer";
        }

        row.appendChild(div);
    });

    //  LURE LABEL — after the zone cards
    const lureLabel = document.createElement("div");
    lureLabel.textContent = "-- Lures --";
    lureLabel.style.color = "#ccc";
    lureLabel.style.fontWeight = "bold";
    lureLabel.style.margin = "10px 0";
    row.appendChild(lureLabel);

    //  LURE CARDS
    Object.keys(lures).forEach(key => {
        const lure = lures[key];
        const div = document.createElement("div");
        div.className = "upgradeCard";

        if (!lure.unlocked) {
            div.innerHTML = `<strong>${lure.name}</strong><br>$${lure.cost}<br><small>${lure.description}</small>`;
            div.onclick = () => tryUnlockLure(key);
            div.style.cursor = "pointer";
        } else {
            const isActive = lure.active;
            div.innerHTML = `<strong>${lure.name}</strong><br>${isActive ? "🎯 Active" : "⭕ Inactive"}<br><small>${lure.description}</small>`;
            div.onclick = () => toggleLure(key);
            div.style.background = isActive ? "#449944" : "#333";
            div.style.cursor = "pointer";
        }

        row.appendChild(div);
    });
}

function tryUnlockZone(zoneKey) {
    const zone = zones[zoneKey];

    if (zone.unlocked) {
        alert(`${zone.name} is already unlocked!`);
        return;
    }

    const cost = zone.cost;
    if (playerMoney >= cost) {
        playerMoney -= cost;
        zones[zoneKey].unlocked = true;
        updateMoneyDisplay();
        renderUpgrades(); // Refresh the upgrade display
        alert(`${zone.name} unlocked! You can now fish there.`);
    } else {
        alert(`Not enough money! You need $${cost.toLocaleString()} but only have $${playerMoney.toLocaleString()}.`);
    }
}

function toggleShop() {
    const shop = document.getElementById("shop");
    const isOpen = shop.style.display === "block";
    shop.style.display = isOpen ? "none" : "block";

    // Toggle upgrade panel visibility
    if (isOpen) {
        upgradePanel.style.display = "none";
        upgradeToggle.style.display = "none";
    } else {
        upgradeToggle.style.display = "block";
        renderUpgrades();
        updateShopDisplay();
    }
}

function tryUnlockLure(lureKey) {
    const lure = lures[lureKey];
    if (lure.unlocked) return;

    if (playerMoney >= lure.cost) {
        playerMoney -= lure.cost;
        lure.unlocked = true;
        updateMoneyDisplay();
        renderUpgrades();
        alert(`${lure.name} unlocked!`);
    } else {
        alert(`Not enough money for ${lure.name}. You need $${lure.cost}.`);
    }
}

// FIXED: Changed selectLure to toggleLure for better UX
function toggleLure(lureKey) {
    const lure = lures[lureKey];
    if (!lure.unlocked) return;

    // If this lure is already active, deactivate it
    if (lure.active) {
        lure.active = false;
    } else {
        // Deactivate all other lures first
        Object.keys(lures).forEach(key => {
            lures[key].active = false;
        });
        // Then activate the selected lure
        lure.active = true;
    }
    renderUpgrades();
}

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function togglePanel(name) {
    const bestiary = document.getElementById("bestiaryPanel");
    const achievements = document.getElementById("achievementsPanel");

    if (name === "bestiary") {
        const isOpen = bestiary.style.display === "block";
        bestiary.style.display = isOpen ? "none" : "block";
        achievements.style.display = "none";
    } else if (name === "achievements") {
        const isOpen = achievements.style.display === "block";
        achievements.style.display = isOpen ? "none" : "block";
        bestiary.style.display = "none";
    }
}

// === Bestiary Panel ===
const bestiaryPanel = document.getElementById("bestiaryPanel");
const bestiaryContent = document.getElementById("bestiaryContent");
const fishDetailPanel = document.getElementById("fishDetailPanel");
const fishDetailClose = document.getElementById("fishDetailClose");

let bestiaryRecords = {}; // { fishName: { rarity, weight, value, description } }
let currentOpenFish = null;

function toggleBestiaryPanel() {
    const isOpen = bestiaryPanel.style.display === "block";
    bestiaryPanel.style.display = isOpen ? "none" : "block";
    achievementsPanel.style.display = "none";
    fishDetailPanel.style.display = "none";
    currentOpenFish = null;
    if (!isOpen) renderBestiary();
}

function toggleAchievementsPanel() {
    const isOpen = achievementsPanel.style.display === "block";
    achievementsPanel.style.display = isOpen ? "none" : "block";
    bestiaryPanel.style.display = "none";
    fishDetailPanel.style.display = "none";
    currentOpenFish = null;
    // TODO: renderAchievements();
}

function renderBestiary() {
    bestiaryContent.innerHTML = "";
    const zonesInUse = Object.keys(zones);

    zonesInUse.forEach(zoneKey => {
        const zoneSection = document.createElement("div");
        zoneSection.className = "bestiaryZoneSection";
        const header = document.createElement("h3");
        header.textContent = zones[zoneKey].name;
        zoneSection.appendChild(header);

        const fishGrid = document.createElement("div");
        fishGrid.className = "bestiaryFishGrid";

        const fishInZone = fishList.filter(f => f.zone === zoneKey);

        fishInZone.forEach(fish => {
            const button = document.createElement("button");
            button.className = "bestiaryFishButton";
            button.textContent = fish.name;

            button.onclick = () => {
                if (currentOpenFish === fish.name) {
                    fishDetailPanel.style.display = "none";
                    currentOpenFish = null;
                } else {
                    showFishDetails(fish);
                    currentOpenFish = fish.name;
                }
            };

            fishGrid.appendChild(button);
        });

        zoneSection.appendChild(fishGrid);
        bestiaryContent.appendChild(zoneSection);
    });
}

function showFishDetails(fish) {
    const record = bestiaryRecords[fish.name];
    const rarity = record ? record.rarity : "-";
    const weight = record ? `${record.weight} kg` : "-";
    const value = record ? `$${record.value}` : "-";

    fishDetailPanel.querySelector(".fish-name").textContent = fish.name;
    fishDetailPanel.querySelector(".fish-rarity").textContent = `Best Rarity: ${rarity}`;
    fishDetailPanel.querySelector(".fish-weight").textContent = `Best Weight: ${weight}`;
    fishDetailPanel.querySelector(".fish-value").textContent = `Best Value: ${value}`;
    fishDetailPanel.querySelector(".fish-description").textContent = fish.description || "A mysterious aquatic creature.";

    fishDetailPanel.style.display = "block";
}

fishDetailClose.onclick = () => {
    fishDetailPanel.style.display = "none";
    currentOpenFish = null;
};

function updateBestiaryRecord(fish) {
    const existing = bestiaryRecords[fish.name];
    if (!existing || fish.finalValue > existing.value) {
        bestiaryRecords[fish.name] = {
            rarity: fish.rarity,
            weight: fish.weight,
            value: fish.finalValue
        };
    }
}

// Initialize the game
resetGameState();
updateMoneyDisplay();
updateShopDisplay();

// Set initial title color
const title = document.querySelector('h1');
title.className = currentZone;

// Start the intervals
setInterval(draw, 1000 / 60); // 60 FPS
setInterval(updateFishPull, 500);