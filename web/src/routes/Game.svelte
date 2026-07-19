<script>
    import { onMount } from "svelte";
    import gsap from "gsap";
    import { navigate } from "../lib/router.svelte.js";

    // ─── Themes Configuration ──────────────────────────────────────────────────
    const THEMES = {
        tavern: {
            id: "tavern",
            name: "Castle Tavern",
            icon: "🏰",
            fontFamily: "'Cinzel', Georgia, serif",
            titleFont: "'Cinzel Decorative', serif",
            bottleEmoji: "🍾",
            bottleStyle: "filter: drop-shadow(0 0 15px rgba(240, 192, 96, 0.8));",
            particles: ["✦", "⚔️", "🍾", "✨", "🍷", "🛡️", "🔮", "⚡"],
            accentColor: "#f0c060",
            glowColor: "rgba(240, 192, 96, 0.5)",
            spinIcon: "⚔️",
            spinText: "SPIN THE BOTTLE",
            joinIcon: "⚔️",
            joinText: "Join the Battle →",
            namePlaceholder: "e.g. Arthur",
            classLabel: "🛡️ Warrior Class",
            genderLabels: ["♂ Knight", "♀ Sorceress", "⚡ Rogue"],
            title: "Spin the Bottle"
        },
        cyberpunk: {
            id: "cyberpunk",
            name: "Cyber Neon",
            icon: "🧬",
            fontFamily: "'Share Tech Mono', monospace",
            titleFont: "'Orbitron', sans-serif",
            bottleEmoji: "🧪",
            bottleStyle: "filter: drop-shadow(0 0 15px rgba(0, 243, 255, 0.9));",
            particles: ["⚡", "💻", "💾", "🤖", "🌐", "🔋", "👾", "▲", "✖"],
            accentColor: "#ff007f",
            glowColor: "rgba(0, 243, 255, 0.6)",
            spinIcon: "⚡",
            spinText: "ACTIVATE SPINNER",
            joinIcon: "🔌",
            joinText: "Connect to Cybernet →",
            namePlaceholder: "e.g. Netrunner_01",
            classLabel: "⚡ Agent Class",
            genderLabels: ["♂ Hacker", "♀ Cyborg", "🤖 Synth"],
            title: "Cyber Spinner"
        },
        spooky: {
            id: "spooky",
            name: "Haunted Mansion",
            icon: "🎃",
            fontFamily: "'Cinzel', Georgia, serif",
            titleFont: "'Creepster', cursive, serif",
            bottleEmoji: "💀",
            bottleStyle: "filter: drop-shadow(0 0 15px rgba(168, 85, 247, 0.8));",
            particles: ["🎃", "🦇", "👻", "🕷️", "🕸️", "⚰️", "🔮", "🧪"],
            accentColor: "#a855f7",
            glowColor: "rgba(168, 85, 247, 0.6)",
            spinIcon: "🔮",
            spinText: "SPIN THE FATE",
            joinIcon: "🕸️",
            joinText: "Enter the Mansion →",
            namePlaceholder: "e.g. Casper",
            classLabel: "🔮 Entity Class",
            genderLabels: ["♂ Vampire", "♀ Witch", "👻 Phantom"],
            title: "Fate Spinner"
        },
        cosmic: {
            id: "cosmic",
            name: "Cosmic Voyage",
            icon: "🚀",
            fontFamily: "'Space Grotesk', sans-serif",
            titleFont: "'Space Grotesk', sans-serif",
            bottleEmoji: "🛸",
            bottleStyle: "filter: drop-shadow(0 0 15px rgba(59, 130, 246, 0.8));",
            particles: ["🌌", "🛸", "🪐", "🌟", "☄️", "🛰️", "🚀", "☀️"],
            accentColor: "#3b82f6",
            glowColor: "rgba(59, 130, 246, 0.6)",
            spinIcon: "🛸",
            spinText: "INITIATE ORBIT",
            joinIcon: "🚀",
            joinText: "Board the Spacecraft →",
            namePlaceholder: "e.g. Neil",
            classLabel: "👨‍🚀 Specialist Class",
            genderLabels: ["♂ Captain", "♀ Pilot", "👽 Alien"],
            title: "Cosmic Orbit"
        },
        arcade: {
            id: "arcade",
            name: "Retro Arcade",
            icon: "🕹️",
            fontFamily: "'Press Start 2P', monospace",
            titleFont: "'Press Start 2P', monospace",
            bottleEmoji: "👾",
            bottleStyle: "filter: drop-shadow(0 0 15px rgba(251, 191, 36, 0.8)); image-rendering: pixelated;",
            particles: ["👾", "🍒", "🪙", "⭐", "🔔", "👻", "❤️", "🕹️"],
            accentColor: "#fbbf24",
            glowColor: "rgba(251, 191, 36, 0.6)",
            spinIcon: "🕹️",
            spinText: "PRESS START",
            joinIcon: "👾",
            joinText: "Insert Coin & Play →",
            namePlaceholder: "e.g. Player_1",
            classLabel: "🕹️ Character Select",
            genderLabels: ["♂ Hero", "♀ Princess", "👾 Boss"],
            title: "Pixel Spinner"
        }
    };

    let currentThemeId = typeof localStorage !== "undefined" ? (localStorage.getItem("game-theme") || "tavern") : "tavern";
    if (!THEMES[currentThemeId]) currentThemeId = "tavern";

    $: activeTheme = THEMES[currentThemeId];

    const selectTheme = (themeId) => {
        if (THEMES[themeId]) {
            currentThemeId = themeId;
            if (typeof localStorage !== "undefined") {
                localStorage.setItem("game-theme", themeId);
            }
            if (typeof document !== "undefined") {
                document.body.className = `theme-${themeId}`;
            }
            generateParticles();
        }
    };

    // Quest Log Modal state
    let showQuestLog = false;
    const toggleQuestLog = () => { showQuestLog = !showQuestLog; };
    const exitQuest = () => {
        navigate("/");
    };

    // ─── State ────────────────────────────────────────────────────────────────
    let phase = "whatsapp";   // "whatsapp" → "join" → "lobby" → "game"
    let roomId = "";
    let botNumber = import.meta.env.VITE_BOT_NUMBER || "254700000000";

    // Join form
    let name = "";
    let gender = "";
    let joinError = "";
    let joining = false;
    let joined = false;

    // Game state
    let players = [];
    let isSpinning = false;
    let selectedPlayer = null;
    let question = null;
    let spinCount = 0;
    let showAd = false;

    // Floating particles state
    let particles = [];

    // ─── Lifecycle ────────────────────────────────────────────────────────────
    const generateParticles = () => {
        const theme = THEMES[currentThemeId] || THEMES.tavern;
        particles = Array.from({ length: 18 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: 10 + Math.random() * 18,
            duration: 6 + Math.random() * 8,
            delay: Math.random() * 5,
            symbol: theme.particles[Math.floor(Math.random() * theme.particles.length)],
            opacity: 0.15 + Math.random() * 0.25,
        }));
    };

    onMount(async () => {
        const parts = window.location.hash.replace("#", "").split("/").filter(Boolean);
        roomId = parts[parts.length - 1] ?? "";

        // Apply theme class to body
        document.body.className = `theme-${currentThemeId}`;

        generateParticles();
    });

    // ─── WhatsApp prompt ──────────────────────────────────────────────────────
    const openInWhatsApp = () => {
        const url = `https://wa.me/${botNumber}?text=${encodeURIComponent("!startgame")}`;
        window.open(url, "_blank");
        phase = "join";
    };
    const skipToJoin = () => { phase = "join"; };

    // ─── Join form ────────────────────────────────────────────────────────────
    const submitJoin = async () => {
        joinError = "";
        if (!name.trim()) { joinError = "Please enter your name, brave soul."; return; }
        if (!gender)       { joinError = "Choose your warrior class!"; return; }

        joining = true;
        try {
            const res = await fetch(`/api/game/${roomId}/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), gender })
            });
            const data = await res.json();
            if (!res.ok) { joinError = data.error ?? "Failed to join."; return; }
            joined = true;
            phase = "lobby";
            await loadPlayers();
        } catch {
            joinError = "Could not reach the game server.";
        } finally {
            joining = false;
        }
    };

    // ─── Lobby / Game ─────────────────────────────────────────────────────────
    const loadPlayers = async () => {
        try {
            const res = await fetch(`/api/game/${roomId}`);
            const data = await res.json();
            players = data.room?.players ?? [];
        } catch {}
    };

    const startGame = () => { phase = "game"; };

    const spinBottle = () => {
        if (isSpinning || players.length < 2) return;
        isSpinning = true;
        selectedPlayer = null;
        question = null;
        showAd = false;

        const targetIndex = Math.floor(Math.random() * players.length);
        const targetPlayer = players[targetIndex];
        const slice = 360 / players.length;
        const finalRotation = 360 * (5 + Math.floor(Math.random() * 5)) + targetIndex * slice;

        gsap.to(".bottle", {
            rotation: finalRotation,
            duration: 4,
            ease: "power4.out",
            onComplete: () => {
                isSpinning = false;
                selectedPlayer = targetPlayer;
                question = pickQuestion(targetPlayer.gender);
                spinCount += 1;
                if (spinCount % 5 === 0) {
                    showAd = true;
                    setTimeout(() => {
                        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
                    }, 100);
                }
            }
        });
    };

    const pickQuestion = (g) => {
        const pool = [
            { text: "What is your most embarrassing memory?", target: "neutral" },
            { text: "What's the wildest thing you've ever done?", target: "neutral" },
            { text: "Describe your perfect date.", target: "neutral" },
            { text: "What's a secret you've never told anyone here?", target: "neutral" },
            { text: "Who in this room would you trust with your life?", target: "neutral" },
        ];
        return pool[Math.floor(Math.random() * pool.length)].text;
    };
</script>




<!-- Realm Navigation -->
<header class="realm-nav">
    <div class="realm-nav-logo">
        <span class="realm-nav-logo-icon">{activeTheme.icon}</span>
        <span class="realm-nav-logo-text">{activeTheme.title}</span>
    </div>
    
    <div class="realm-nav-theme-list">
        {#each Object.values(THEMES) as t}
            <button 
                class="realm-nav-theme-btn {currentThemeId === t.id ? 'active' : ''}" 
                on:click={() => selectTheme(t.id)}
                title="Switch to {t.name}"
            >
                <span class="theme-btn-icon">{t.icon}</span>
                <span class="theme-btn-label">{t.name}</span>
            </button>
        {/each}
    </div>
    
    <div class="realm-nav-actions">
        <button class="realm-nav-action-btn" on:click={toggleQuestLog} title="How to Play">
            📜 <span class="action-label">Quest Log</span>
        </button>
        <button class="realm-nav-action-btn" on:click={exitQuest} title="Return to Citadel">
            🚪 <span class="action-label">Exit</span>
        </button>
    </div>
</header>

<!-- Quest Log Modal -->
{#if showQuestLog}
<div class="quest-modal-overlay" on:click={toggleQuestLog}>
    <div class="quest-modal-card" on:click|stopPropagation>
        <div class="quest-modal-header">
            <h3>📜 Quest Log: Instructions</h3>
            <button class="close-btn" on:click={toggleQuestLog}>&times;</button>
        </div>
        <div class="quest-modal-body">
            <p>Welcome to <strong>{activeTheme.title}</strong>!</p>
            <ol class="quest-steps">
                <li>
                    <strong>Step 1: Join the Room</strong>
                    <p>Enter your nickname and choose your class to enter the Hall.</p>
                </li>
                <li>
                    <strong>Step 2: Gather Adventurers</strong>
                    <p>Invite friends to join the room code: <span class="highlight">{roomId}</span>. You can also join via WhatsApp by typing <code class="code-highlight">!startgame</code> to the bot.</p>
                </li>
                <li>
                    <strong>Step 3: Spin the Bottle</strong>
                    <p>Click the <strong>Spin</strong> button to roll the bottle/pointer. The pointer will spin and land on a random player.</p>
                </li>
                <li>
                    <strong>Step 4: Answer the Ritual Question</strong>
                    <p>The chosen player must answer a random Truth or Dare question! You can also control the spinner from WhatsApp by typing <code class="code-highlight">!spin</code> in the group chat.</p>
                </li>
            </ol>
        </div>
        <div class="quest-modal-footer">
            <button class="rpg-btn rpg-btn-primary" on:click={toggleQuestLog}>Close Scroll</button>
        </div>
    </div>
</div>
{/if}

<!-- Floating theme particles -->
{#each particles as p (p.id)}
<div
    class="particle"
    style="
        left: {p.x}%;
        top: {p.y}%;
        font-size: {p.size}px;
        opacity: {p.opacity};
        animation-duration: {p.duration}s;
        animation-delay: -{p.delay}s;
    "
>{p.symbol}</div>
{/each}

<!-- ═══════════════════════════════════════════════════════════════════════════
     PHASE: Open in WhatsApp
════════════════════════════════════════════════════════════════════════════ -->
{#if phase === "whatsapp"}
<div class="screen">
    <div class="portal-card">
        <div class="rune-border"></div>
        <div class="card-inner text-center">
            <div class="game-title-icon">{activeTheme.bottleEmoji}</div>
            <h1 class="title-text">{activeTheme.title}</h1>
            <p class="subtitle-text">
                A mystical invitation awaits you!<br>
                Enter the WhatsApp realm to join your party.
            </p>

            <button on:click={openInWhatsApp} class="rpg-btn rpg-btn-wa">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.116.554 4.127 1.528 5.877L0 24l6.266-1.513A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.012-1.372l-.36-.214-3.72.898.938-3.63-.235-.375A9.818 9.818 0 1112 21.818z"/>
                </svg>
                ⚔️ Open WhatsApp
            </button>

            <button on:click={skipToJoin} class="rpg-btn rpg-btn-ghost">
                Already in the realm → Enter name
            </button>
        </div>
    </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════════════════
     PHASE: Join Form
════════════════════════════════════════════════════════════════════════════ -->
{:else if phase === "join"}
<div class="screen">
    <div class="portal-card">
        <div class="rune-border"></div>
        <div class="card-inner">
            <div class="text-center mb-1">
                <div class="game-title-icon">{activeTheme.bottleEmoji}</div>
                <h2 class="title-text" style="font-size:1.6rem">{activeTheme.title}</h2>
                <p class="subtitle-text text-sm">Room <span class="room-id">{roomId}</span></p>
            </div>

            <label class="rpg-label">{activeTheme.spinIcon} Your Name</label>
            <input
                bind:value={name}
                placeholder={activeTheme.namePlaceholder}
                class="rpg-input"
                maxlength="32"
                on:keydown={e => e.key === "Enter" && submitJoin()}
            />

            <label class="rpg-label" style="margin-top:1rem">{activeTheme.classLabel}</label>
            <div class="gender-grid">
                {#each [["M", activeTheme.genderLabels[0], "#3b82f6"], ["F", activeTheme.genderLabels[1], "#ec4899"], ["O", activeTheme.genderLabels[2], "#8b5cf6"]] as [val, label, color]}
                    <button
                        on:click={() => gender = val}
                        class="gender-btn"
                        style="
                            background: {gender === val ? color : 'rgba(255,255,255,0.07)'};
                            border: 2px solid {gender === val ? color : 'rgba(255,255,255,0.15)'};
                            box-shadow: {gender === val ? `0 0 18px ${color}55` : 'none'};
                        "
                    >{label}</button>
                {/each}
            </div>

            {#if joinError}
                <p class="error-text">⚠️ {joinError}</p>
            {/if}

            <button on:click={submitJoin} disabled={joining} class="rpg-btn rpg-btn-primary w-full mt-5">
                {joining ? "Entering the realm..." : `${activeTheme.joinIcon} ${activeTheme.joinText}`}
            </button>
        </div>
    </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════════════════
     PHASE: Lobby
════════════════════════════════════════════════════════════════════════════ -->
{:else if phase === "lobby"}
<div class="screen">
    <div class="portal-card">
        <div class="rune-border"></div>
        <div class="card-inner text-center">
            <div class="game-title-icon">{activeTheme.icon}</div>
            <h2 class="title-text" style="font-size:1.6rem">Lobby: {activeTheme.title}</h2>
            <p class="subtitle-text">
                <span class="player-name-highlight">{name}</span> has joined the party!<br>
                <span class="player-count">{players.length} warrior{players.length !== 1 ? "s" : ""}</span> ready for battle.
            </p>

            <div class="players-list">
                {#each players as p, i}
                    <div class="player-chip" style="background: hsl({i * 47}, 65%, 45%); box-shadow: 0 0 12px hsl({i*47},65%,45%,0.4)">
                        <span class="chip-letter">{p.name[0]}</span>
                        <span class="chip-name">{p.name}</span>
                    </div>
                {/each}
            </div>

            <button on:click={startGame} class="rpg-btn rpg-btn-primary w-full">
                {activeTheme.spinIcon} Begin the Ritual {activeTheme.bottleEmoji}
            </button>
            <p class="hint-text">The host can also spin from WhatsApp with <code class="code-hint">!spin</code></p>
        </div>
    </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════════════════
     PHASE: Game
════════════════════════════════════════════════════════════════════════════ -->
{:else}
<div class="screen game-screen">

    <!-- Header -->
    <div class="game-header">
        <h1 class="game-main-title">{activeTheme.title}</h1>
        <p class="game-subtitle">{players.length} adventurers · Round {spinCount + 1}</p>
    </div>

    <!-- Players Circle + Bottle -->
    <div class="arena">
        {#each players as player, i}
            <div
                class="player-avatar {selectedPlayer?.name === player.name ? 'player-avatar--selected' : ''}"
                style="
                    background: hsl({(360 / players.length) * i * 2}, 75%, 50%);
                    transform: rotate({(360 / players.length) * i}deg) translate(135px) rotate(-{(360 / players.length) * i}deg);
                    box-shadow: 0 0 0 3px rgba(255,255,255,0.3){selectedPlayer?.name === player.name ? ', 0 0 20px gold, 0 0 40px rgba(255,215,0,0.4)' : ''};
                "
            >{player.name[0]}</div>
        {/each}

        <!-- Bottle -->
        <div class="bottle-wrap">
            <div class="bottle-glow" style="background: radial-gradient(circle, {activeTheme.glowColor}, transparent 70%);"></div>
            <div class="bottle" style={activeTheme.bottleStyle}>{activeTheme.bottleEmoji}</div>
        </div>
    </div>

    <!-- Result card -->
    <div class="result-area">
        {#if selectedPlayer && question}
            <div class="result-card animate-slide-up">
                <div class="result-header">
                    <div class="result-avatar" style="background: #7c3aed">{selectedPlayer.name[0]}</div>
                    <h2 class="result-name">{selectedPlayer.name}'s turn!</h2>
                </div>
                <p class="result-question">{question}</p>
            </div>
        {/if}

        <button
            on:click={spinBottle}
            disabled={isSpinning || players.length < 2}
            class="rpg-btn rpg-btn-spin"
        >
            {isSpinning ? "✨ SPINNING..." : `${activeTheme.spinIcon} ${activeTheme.spinText}`}
        </button>

        {#if players.length < 2}
            <p class="hint-text" style="color:rgba(255,255,255,0.5)">Need at least 2 adventurers to spin.</p>
        {/if}
    </div>
</div>

<!-- Ad pill -->
{#if showAd}
<div class="ad-pill">
    <span class="ad-label">Ad</span>
    <ins class="adsbygoogle"
        style="display:inline-block; width:300px; height:50px;"
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot="1111111111">
    </ins>
</div>
{/if}
{/if}

<style>
    /* ── Global reset & Theme Body Selectors ────────────────────── */
    :global(body) {
        margin: 0;
        min-height: 100dvh;
        overflow-x: hidden;
        transition: background 0.5s ease, font-family 0.3s ease;
    }
    
    :global(body.theme-tavern) {
        font-family: 'Cinzel', Georgia, serif;
        background-image: url('/images/game-bg.png');
        background-size: cover;
        background-position: center;
        background-attachment: fixed;
    }
    
    :global(body.theme-cyberpunk) {
        font-family: 'Share Tech Mono', monospace;
        background-color: #030008;
        background-image: 
            radial-gradient(circle at 10% 20%, rgba(255, 0, 128, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(0, 243, 255, 0.08) 0%, transparent 40%),
            linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), 
            linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
        background-size: 100% 100%, 100% 100%, 100% 4px, 6px 100%;
        background-attachment: fixed;
    }
    
    :global(body.theme-spooky) {
        font-family: 'Cinzel', Georgia, serif;
        background-color: #0d0614;
        background-image: 
            radial-gradient(circle at 50% 30%, rgba(168, 85, 247, 0.12) 0%, transparent 60%),
            radial-gradient(circle at 20% 80%, rgba(16, 185, 129, 0.05) 0%, transparent 40%),
            linear-gradient(to bottom, rgba(5, 2, 10, 0.7), rgba(0, 0, 0, 0.95));
        background-size: cover;
        background-attachment: fixed;
    }
    
    :global(body.theme-cosmic) {
        font-family: 'Space Grotesk', sans-serif;
        background-color: #020205;
        background-image: 
            radial-gradient(1.5px 1.5px at 20px 30px, rgba(255,255,255,0.7) 100%, transparent),
            radial-gradient(2px 2px at 150px 80px, rgba(255,255,255,0.6) 100%, transparent),
            radial-gradient(1px 1px at 80px 220px, rgba(255,255,255,0.8) 100%, transparent),
            radial-gradient(2px 2px at 250px 140px, rgba(255,255,255,0.5) 100%, transparent),
            radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.12) 0%, transparent 50%),
            linear-gradient(to bottom, rgba(2, 4, 12, 0.8), rgba(9, 9, 11, 0.95));
        background-size: 300px 300px, 400px 400px, 350px 350px, 500px 500px, 100% 100%, 100% 100%;
        background-attachment: fixed;
    }
    
    :global(body.theme-arcade) {
        font-family: 'Press Start 2P', monospace;
        font-size: 14px;
        background-color: #080510;
        background-image: 
            linear-gradient(rgba(255, 0, 128, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 0, 128, 0.05) 1px, transparent 1px),
            radial-gradient(circle at center, rgba(251, 191, 36, 0.08) 0%, transparent 60%);
        background-size: 40px 40px, 40px 40px, 100% 100%;
        background-attachment: fixed;
    }

    /* ── Floating particles ─────────────────────────────────────── */
    .particle {
        position: fixed;
        pointer-events: none;
        z-index: 0;
        animation: floatUp linear infinite;
        user-select: none;
    }
    @keyframes floatUp {
        0%   { transform: translateY(0px) rotate(0deg); opacity: var(--op, 0.2); }
        50%  { transform: translateY(-30px) rotate(180deg); }
        100% { transform: translateY(0px) rotate(360deg); opacity: var(--op, 0.2); }
    }

    /* ── Screen layout ──────────────────────────────────────────── */
    .screen {
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 80px 16px 24px; /* Added 80px padding-top to clear the sticky nav bar! */
        position: relative;
        z-index: 1;
        box-sizing: border-box;
    }
    @media (max-width: 768px) {
        .screen {
            padding: 72px 12px 16px;
        }
    }
    
    /* Scoped theme overlays for screens */
    :global(body.theme-tavern) .screen {
        background: linear-gradient(to bottom, rgba(15, 10, 5, 0.55), rgba(30, 20, 10, 0.7));
    }
    :global(body.theme-cyberpunk) .screen {
        background: linear-gradient(to bottom, rgba(5, 2, 10, 0.6), rgba(0, 5, 15, 0.8));
    }
    :global(body.theme-spooky) .screen {
        background: linear-gradient(to bottom, rgba(13, 2, 23, 0.7), rgba(5, 0, 10, 0.95));
    }
    :global(body.theme-cosmic) .screen {
        background: linear-gradient(to bottom, rgba(2, 4, 12, 0.6), rgba(9, 9, 11, 0.9));
    }
    :global(body.theme-arcade) .screen {
        background: linear-gradient(to bottom, rgba(8, 5, 16, 0.7), rgba(4, 2, 8, 0.9));
    }
    
    /* ── Theme Specific Overrides ────────────────────────────────── */
    
    /* Cyberpunk Theme Style overrides */
    :global(body.theme-cyberpunk) {
        color: #e6f8ff;
    }
    :global(body.theme-cyberpunk) .title-text {
        font-family: 'Orbitron', sans-serif;
        background: linear-gradient(135deg, #00f3ff, #ff007f, #00f3ff);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: shimmer 3s linear infinite;
        filter: drop-shadow(0 0 10px rgba(0, 243, 255, 0.5));
    }
    :global(body.theme-cyberpunk) .game-main-title {
        font-family: 'Orbitron', sans-serif;
        background: linear-gradient(135deg, #00f3ff, #ff007f, #00f3ff);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        filter: drop-shadow(0 0 10px rgba(0, 243, 255, 0.5));
    }
    :global(body.theme-cyberpunk) .subtitle-text {
        color: rgba(0, 243, 255, 0.7);
        font-family: 'Share Tech Mono', monospace;
    }
    :global(body.theme-cyberpunk) .rpg-label {
        font-family: 'Share Tech Mono', monospace;
        color: #00f3ff;
    }
    :global(body.theme-cyberpunk) .card-inner {
        background: rgba(5, 5, 10, 0.92);
        border: 2px solid #00f3ff;
        border-radius: 8px;
        box-shadow: 0 0 15px rgba(0, 243, 255, 0.3);
    }
    :global(body.theme-cyberpunk) .rune-border {
        border-radius: 10px;
        background: linear-gradient(135deg, #00f3ff, #ff007f, #00f3ff);
        background-size: 300% 300%;
    }
    :global(body.theme-cyberpunk) .rpg-input {
        font-family: 'Share Tech Mono', monospace;
        border-radius: 4px;
        border: 1px solid rgba(0, 243, 255, 0.4);
        background: rgba(0, 15, 30, 0.6);
    }
    :global(body.theme-cyberpunk) .rpg-input:focus {
        border-color: #00f3ff;
        box-shadow: 0 0 8px rgba(0, 243, 255, 0.4);
    }
    :global(body.theme-cyberpunk) .rpg-btn-primary {
        font-family: 'Orbitron', sans-serif;
        background: linear-gradient(135deg, #ff007f, #7928ca);
        color: white;
        border-radius: 4px;
        box-shadow: 0 0 12px rgba(255, 0, 127, 0.4);
        border: 1px solid #ff007f;
    }
    :global(body.theme-cyberpunk) .rpg-btn-spin {
        font-family: 'Orbitron', sans-serif;
        background: linear-gradient(135deg, #ff007f, #00f3ff, #ff007f);
        background-size: 200% auto;
        color: white;
        border-radius: 4px;
        box-shadow: 0 0 25px rgba(0, 243, 255, 0.5);
    }
    :global(body.theme-cyberpunk) .player-avatar {
        font-family: 'Orbitron', sans-serif;
        border-radius: 8px;
        border: 2px solid #00f3ff;
    }
    :global(body.theme-cyberpunk) .player-avatar--selected {
        border-color: #ff007f !important;
        animation: selectedCyberPulse 1s ease-in-out infinite;
    }
    @keyframes selectedCyberPulse {
        0%, 100% { box-shadow: 0 0 0 3px rgba(255,0,127,0.3), 0 0 20px #ff007f; }
        50% { box-shadow: 0 0 0 8px rgba(255,0,127,0.1), 0 0 40px #ff007f; }
    }
    :global(body.theme-cyberpunk) .result-card {
        background: rgba(5, 5, 10, 0.92);
        border: 1px solid #00f3ff;
        border-radius: 8px;
        box-shadow: 0 0 20px rgba(0, 243, 255, 0.2);
    }

    /* Spooky Theme Style overrides */
    :global(body.theme-spooky) {
        color: rgba(230, 220, 245, 0.95);
    }
    :global(body.theme-spooky) .title-text {
        font-family: 'Creepster', cursive, serif;
        font-weight: normal;
        background: linear-gradient(135deg, #a855f7, #ec4899, #a855f7);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: shimmer 3s linear infinite;
        filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.6));
    }
    :global(body.theme-spooky) .game-main-title {
        font-family: 'Creepster', cursive, serif;
        font-weight: normal;
        background: linear-gradient(135deg, #a855f7, #ec4899, #a855f7);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.6));
    }
    :global(body.theme-spooky) .subtitle-text {
        color: rgba(168, 85, 247, 0.7);
    }
    :global(body.theme-spooky) .rpg-label {
        color: #a855f7;
    }
    :global(body.theme-spooky) .card-inner {
        background: rgba(10, 5, 18, 0.92);
        border: 1px solid rgba(168, 85, 247, 0.4);
        border-radius: 16px;
        box-shadow: 0 0 25px rgba(168, 85, 247, 0.2);
    }
    :global(body.theme-spooky) .rune-border {
        border-radius: 18px;
        background: linear-gradient(135deg, #a855f7, #6b21a8, #ec4899, #a855f7);
        background-size: 300% 300%;
    }
    :global(body.theme-spooky) .rpg-input {
        border-radius: 8px;
        border: 1px solid rgba(168, 85, 247, 0.3);
        background: rgba(20, 10, 30, 0.6);
    }
    :global(body.theme-spooky) .rpg-input:focus {
        border-color: #a855f7;
        box-shadow: 0 0 8px rgba(168, 85, 247, 0.3);
    }
    :global(body.theme-spooky) .rpg-btn-primary {
        background: linear-gradient(135deg, #a855f7, #6b21a8);
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
        border: 1px solid rgba(168, 85, 247, 0.5);
    }
    :global(body.theme-spooky) .rpg-btn-spin {
        background: linear-gradient(135deg, #a855f7, #e11d48, #a855f7);
        background-size: 200% auto;
        color: white;
        box-shadow: 0 0 25px rgba(168, 85, 247, 0.5);
    }
    :global(body.theme-spooky) .player-avatar {
        border-radius: 50%;
        border: 2px solid rgba(168, 85, 247, 0.5);
    }
    :global(body.theme-spooky) .player-avatar--selected {
        border-color: #a855f7 !important;
        animation: selectedSpookyPulse 1s ease-in-out infinite;
    }
    @keyframes selectedSpookyPulse {
        0%, 100% { box-shadow: 0 0 0 3px rgba(168,85,247,0.3), 0 0 20px #a855f7; }
        50% { box-shadow: 0 0 0 8px rgba(168,85,247,0.1), 0 0 40px #a855f7; }
    }
    :global(body.theme-spooky) .result-card {
        background: rgba(10, 5, 18, 0.92);
        border: 1px solid rgba(168, 85, 247, 0.4);
        border-radius: 16px;
        box-shadow: 0 0 20px rgba(168, 85, 247, 0.2);
    }

    /* Cosmic Theme Style overrides */
    :global(body.theme-cosmic) {
        color: rgba(240, 245, 255, 0.95);
    }
    :global(body.theme-cosmic) .title-text {
        font-family: 'Space Grotesk', sans-serif;
        background: linear-gradient(135deg, #3b82f6, #60a5fa, #3b82f6);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: shimmer 3s linear infinite;
        filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.5));
    }
    :global(body.theme-cosmic) .game-main-title {
        font-family: 'Space Grotesk', sans-serif;
        background: linear-gradient(135deg, #3b82f6, #60a5fa, #3b82f6);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.5));
    }
    :global(body.theme-cosmic) .subtitle-text {
        color: rgba(147, 197, 253, 0.7);
        font-family: 'Space Grotesk', sans-serif;
    }
    :global(body.theme-cosmic) .rpg-label {
        font-family: 'Space Grotesk', sans-serif;
        color: #60a5fa;
    }
    :global(body.theme-cosmic) .card-inner {
        background: rgba(8, 12, 28, 0.92);
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: 20px;
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
    }
    :global(body.theme-cosmic) .rune-border {
        border-radius: 22px;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8, #00f3ff, #3b82f6);
        background-size: 300% 300%;
    }
    :global(body.theme-cosmic) .rpg-input {
        font-family: 'Space Grotesk', sans-serif;
        border-radius: 12px;
        border: 1px solid rgba(59, 130, 246, 0.3);
        background: rgba(10, 20, 45, 0.6);
    }
    :global(body.theme-cosmic) .rpg-input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
    }
    :global(body.theme-cosmic) .rpg-btn-primary {
        font-family: 'Space Grotesk', sans-serif;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        border-radius: 12px;
        box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
    }
    :global(body.theme-cosmic) .rpg-btn-spin {
        font-family: 'Space Grotesk', sans-serif;
        background: linear-gradient(135deg, #3b82f6, #00f3ff, #3b82f6);
        background-size: 200% auto;
        color: white;
        border-radius: 999px;
        box-shadow: 0 0 25px rgba(59, 130, 246, 0.5);
    }
    :global(body.theme-cosmic) .player-avatar {
        font-family: 'Space Grotesk', sans-serif;
        border-radius: 50%;
        border: 2px solid rgba(59, 130, 246, 0.4);
    }
    :global(body.theme-cosmic) .player-avatar--selected {
        border-color: #60a5fa !important;
        animation: selectedCosmicPulse 1s ease-in-out infinite;
    }
    @keyframes selectedCosmicPulse {
        0%, 100% { box-shadow: 0 0 0 3px rgba(96,165,250,0.3), 0 0 20px #60a5fa; }
        50% { box-shadow: 0 0 0 8px rgba(96,165,250,0.1), 0 0 40px #60a5fa; }
    }
    :global(body.theme-cosmic) .result-card {
        background: rgba(8, 12, 28, 0.92);
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: 20px;
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
    }

    /* Arcade Theme Style overrides */
    :global(body.theme-arcade) {
        color: #ffffff;
    }
    :global(body.theme-arcade) .title-text {
        font-family: 'Press Start 2P', monospace;
        font-size: 0.9rem;
        background: linear-gradient(135deg, #fbbf24, #f59e0b, #fbbf24);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.5));
    }
    :global(body.theme-arcade) .game-main-title {
        font-family: 'Press Start 2P', monospace;
        font-size: 1.0rem;
        background: linear-gradient(135deg, #fbbf24, #f59e0b, #fbbf24);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.5));
    }
    :global(body.theme-arcade) .subtitle-text {
        color: #fbbf24;
        font-family: 'Press Start 2P', monospace;
        font-size: 0.55rem;
        line-height: 1.8;
    }
    :global(body.theme-arcade) .rpg-label {
        font-family: 'Press Start 2P', monospace;
        font-size: 0.55rem;
        color: #fbbf24;
    }
    :global(body.theme-arcade) .card-inner {
        background: rgba(15, 10, 25, 0.98);
        border: 4px double #fbbf24;
        border-radius: 0px;
        box-shadow: 0 0 20px rgba(251, 191, 36, 0.2);
    }
    :global(body.theme-arcade) .rune-border {
        border-radius: 0px;
        background: #fbbf24;
        inset: -4px;
    }
    :global(body.theme-arcade) .rpg-input {
        font-family: 'Press Start 2P', monospace;
        font-size: 0.65rem;
        border-radius: 0px;
        border: 2px solid #fbbf24;
        background: #000000;
    }
    :global(body.theme-arcade) .rpg-input:focus {
        border-color: #ffffff;
        box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
    }
    :global(body.theme-arcade) .rpg-btn-primary {
        font-family: 'Press Start 2P', monospace;
        font-size: 0.6rem;
        background: linear-gradient(135deg, #fbbf24, #d97706);
        color: black;
        border-radius: 0px;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 0px #78350f;
    }
    :global(body.theme-arcade) .rpg-btn-primary:active {
        transform: translateY(4px);
        box-shadow: none;
    }
    :global(body.theme-arcade) .rpg-btn-spin {
        font-family: 'Press Start 2P', monospace;
        font-size: 0.7rem;
        background: linear-gradient(135deg, #f59e0b, #fbbf24, #f59e0b);
        background-size: 200% auto;
        color: black;
        border-radius: 0px;
        border: 4px solid #ffffff;
        box-shadow: 0 6px 0px #b45309;
    }
    :global(body.theme-arcade) .rpg-btn-spin:active {
        transform: translateY(6px);
        box-shadow: none;
    }
    :global(body.theme-arcade) .player-avatar {
        font-family: 'Press Start 2P', monospace;
        border-radius: 0px;
        border: 2px solid #fbbf24;
        font-size: 0.75rem;
    }
    :global(body.theme-arcade) .player-avatar--selected {
        border-color: #ffffff !important;
        animation: selectedArcadePulse 0.5s steps(2) infinite;
    }
    @keyframes selectedArcadePulse {
        0%, 100% { box-shadow: 0 0 0 4px #fbbf24; }
        50% { box-shadow: 0 0 0 8px #ffffff; }
    }
    :global(body.theme-arcade) .result-card {
        background: rgba(15, 10, 25, 0.98);
        border: 4px double #fbbf24;
        border-radius: 0px;
        box-shadow: 0 0 20px rgba(251, 191, 36, 0.2);
    }
    :global(body.theme-arcade) .result-name {
        font-family: 'Press Start 2P', monospace;
        font-size: 0.7rem;
    }
    :global(body.theme-arcade) .result-question {
        font-family: 'Press Start 2P', monospace;
        font-size: 0.6rem;
        line-height: 1.8;
    }
    :global(body.theme-arcade) .player-name-highlight {
        font-family: 'Press Start 2P', monospace;
        font-size: 0.65rem;
    }
    :global(body.theme-arcade) .hint-text {
        font-family: 'Press Start 2P', monospace;
        font-size: 0.5rem;
    }

    /* ── Realm Navigation Styling ───────────────────────────────── */
    .realm-nav {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 64px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 24px;
        background: rgba(8, 16, 36, 0.65);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        z-index: 100;
        transition: all 0.3s ease;
    }
    .realm-nav-logo {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .realm-nav-logo-icon {
        font-size: 1.4rem;
        filter: drop-shadow(0 0 8px rgba(255,255,255,0.3));
    }
    .realm-nav-logo-text {
        font-size: 0.9rem;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #ffffff;
        font-weight: bold;
    }
    .realm-nav-theme-list {
        display: flex;
        gap: 4px;
        background: rgba(0, 0, 0, 0.25);
        padding: 4px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .realm-nav-theme-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        background: transparent;
        border: none;
        padding: 6px 12px;
        border-radius: 999px;
        color: rgba(255, 255, 255, 0.6);
        font-family: inherit;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .realm-nav-theme-btn:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.05);
    }
    .realm-nav-theme-btn.active {
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
    }
    .realm-nav-actions {
        display: flex;
        gap: 8px;
    }
    .realm-nav-action-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 8px 12px;
        border-radius: 10px;
        color: #ffffff;
        font-family: inherit;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .realm-nav-action-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.2);
    }

    /* Responsive navigation adjustments */
    @media (max-width: 820px) {
        .realm-nav {
            padding: 0 10px;
            height: 56px;
        }
        .realm-nav-logo-text, .theme-btn-label, .action-label {
            display: none; /* Hide labels on mobile/small viewports */
        }
        .realm-nav-theme-list {
            gap: 2px;
        }
        .realm-nav-theme-btn {
            padding: 6px 8px;
        }
        .realm-nav-action-btn {
            padding: 8px;
            border-radius: 50%;
        }
    }

    /* Theme Dynamic Overrides for Navigation Bar */
    
    /* Tavern Theme Nav */
    :global(body.theme-tavern) .realm-nav {
        background: rgba(20, 15, 8, 0.85);
        border-bottom: 2px solid #f0c060;
        font-family: 'Cinzel', serif;
    }
    :global(body.theme-tavern) .realm-nav-theme-btn.active {
        background: #f0c060;
        color: #1a0e00;
    }
    :global(body.theme-tavern) .realm-nav-action-btn {
        border-color: rgba(240, 192, 96, 0.3);
        background: rgba(240, 192, 96, 0.08);
        color: #f0c060;
    }
    :global(body.theme-tavern) .realm-nav-action-btn:hover {
        background: rgba(240, 192, 96, 0.18);
        border-color: #f0c060;
    }

    /* Cyberpunk Theme Nav */
    :global(body.theme-cyberpunk) .realm-nav {
        background: rgba(5, 5, 10, 0.85);
        border-bottom: 2px solid #00f3ff;
        font-family: 'Share Tech Mono', monospace;
    }
    :global(body.theme-cyberpunk) .realm-nav-theme-list {
        border-radius: 0px;
        border: 1px solid rgba(0, 243, 255, 0.3);
    }
    :global(body.theme-cyberpunk) .realm-nav-theme-btn {
        border-radius: 0px;
    }
    :global(body.theme-cyberpunk) .realm-nav-theme-btn.active {
        background: #ff007f;
        color: #ffffff;
        box-shadow: 0 0 10px #ff007f;
    }
    :global(body.theme-cyberpunk) .realm-nav-action-btn {
        border-radius: 0px;
        border-color: #00f3ff;
        background: rgba(0, 243, 255, 0.08);
        color: #00f3ff;
    }
    :global(body.theme-cyberpunk) .realm-nav-action-btn:hover {
        background: #00f3ff;
        color: #000;
    }

    /* Spooky Theme Nav */
    :global(body.theme-spooky) .realm-nav {
        background: rgba(10, 5, 18, 0.85);
        border-bottom: 1px solid rgba(168, 85, 247, 0.4);
        font-family: 'Cinzel', serif;
    }
    :global(body.theme-spooky) .realm-nav-theme-btn.active {
        background: #a855f7;
        color: #ffffff;
        box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
    }
    :global(body.theme-spooky) .realm-nav-action-btn {
        border-color: rgba(168, 85, 247, 0.3);
        background: rgba(168, 85, 247, 0.08);
        color: #a855f7;
    }
    :global(body.theme-spooky) .realm-nav-action-btn:hover {
        background: rgba(168, 85, 247, 0.2);
        border-color: #a855f7;
    }

    /* Cosmic Theme Nav */
    :global(body.theme-cosmic) .realm-nav {
        background: rgba(8, 12, 28, 0.85);
        border-bottom: 1px solid rgba(59, 130, 246, 0.3);
        font-family: 'Space Grotesk', sans-serif;
    }
    :global(body.theme-cosmic) .realm-nav-theme-btn.active {
        background: #3b82f6;
        color: #ffffff;
        box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
    }
    :global(body.theme-cosmic) .realm-nav-action-btn {
        border-radius: 12px;
        border-color: rgba(59, 130, 246, 0.3);
        background: rgba(59, 130, 246, 0.08);
        color: #60a5fa;
    }
    :global(body.theme-cosmic) .realm-nav-action-btn:hover {
        background: rgba(59, 130, 246, 0.2);
        border-color: #3b82f6;
    }

    /* Arcade Theme Nav */
    :global(body.theme-arcade) .realm-nav {
        background: #080510;
        border-bottom: 4px double #fbbf24;
        font-family: 'Press Start 2P', monospace;
    }
    :global(body.theme-arcade) .realm-nav-theme-list {
        border-radius: 0px;
        border: 2px solid #fbbf24;
    }
    :global(body.theme-arcade) .realm-nav-theme-btn {
        border-radius: 0px;
        font-size: 0.55rem;
    }
    :global(body.theme-arcade) .realm-nav-theme-btn.active {
        background: #fbbf24;
        color: #000000;
    }
    :global(body.theme-arcade) .realm-nav-action-btn {
        border-radius: 0px;
        border: 2px solid #fbbf24;
        background: #000000;
        color: #fbbf24;
        font-size: 0.55rem;
    }
    :global(body.theme-arcade) .realm-nav-action-btn:hover {
        background: #fbbf24;
        color: #000000;
    }

    /* ── Quest Scroll Modal Styling ────────────────────────────── */
    .quest-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 16px;
    }
    .quest-modal-card {
        background: rgba(8, 16, 36, 0.96);
        border: 1px solid rgba(240, 192, 96, 0.4);
        border-radius: 20px;
        width: 100%;
        max-width: 500px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    }
    @keyframes modalFadeIn {
        from { opacity: 0; transform: scale(0.95) translateY(10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .quest-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .quest-modal-header h3 {
        margin: 0;
        font-size: 1.2rem;
        color: #f0c060;
        font-family: inherit;
    }
    .close-btn {
        background: transparent;
        border: none;
        color: rgba(255,255,255,0.5);
        font-size: 1.8rem;
        cursor: pointer;
        line-height: 1;
        transition: color 0.2s;
    }
    .close-btn:hover {
        color: #ffffff;
    }
    .quest-modal-body {
        padding: 24px;
        max-height: 60vh;
        overflow-y: auto;
        font-family: inherit;
        font-size: 0.9rem;
        line-height: 1.6;
    }
    .quest-steps {
        margin: 16px 0 0 0;
        padding-left: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    .quest-steps li {
        font-family: inherit;
    }
    .quest-steps li strong {
        color: #ffffff;
        font-size: 0.95rem;
    }
    .quest-steps li p {
        margin: 4px 0 0 0;
        color: rgba(255,255,255,0.7);
    }
    .highlight {
        color: #86efac;
        font-weight: 700;
    }
    .quest-modal-footer {
        padding: 16px 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        justify-content: flex-end;
    }

    /* Dynamic Theme Overrides for Scroll Modal */
    :global(body.theme-tavern) .quest-modal-card {
        background: rgba(20, 15, 8, 0.98);
        border: 2px solid #f0c060;
        font-family: 'Cinzel', serif;
    }
    :global(body.theme-tavern) .quest-modal-header h3 {
        color: #f0c060;
    }
    
    :global(body.theme-cyberpunk) .quest-modal-card {
        background: rgba(5, 5, 10, 0.98);
        border: 2px solid #00f3ff;
        border-radius: 0;
        font-family: 'Share Tech Mono', monospace;
        box-shadow: 0 0 25px rgba(0, 243, 255, 0.3);
    }
    :global(body.theme-cyberpunk) .quest-modal-header h3 {
        color: #00f3ff;
        font-family: 'Orbitron', sans-serif;
    }
    :global(body.theme-cyberpunk) .highlight {
        color: #ff007f;
    }
    :global(body.theme-cyberpunk) .quest-modal-header,
    :global(body.theme-cyberpunk) .quest-modal-footer {
        border-color: rgba(0, 243, 255, 0.2);
    }

    :global(body.theme-spooky) .quest-modal-card {
        background: rgba(10, 5, 18, 0.98);
        border: 1px solid rgba(168, 85, 247, 0.5);
        border-radius: 16px;
        font-family: 'Cinzel', serif;
        box-shadow: 0 0 25px rgba(168, 85, 247, 0.3);
    }
    :global(body.theme-spooky) .quest-modal-header h3 {
        color: #a855f7;
        font-family: 'Creepster', serif;
    }
    :global(body.theme-spooky) .highlight {
        color: #a855f7;
    }
    :global(body.theme-spooky) .quest-modal-header,
    :global(body.theme-spooky) .quest-modal-footer {
        border-color: rgba(168, 85, 247, 0.2);
    }

    :global(body.theme-cosmic) .quest-modal-card {
        background: rgba(8, 12, 28, 0.98);
        border: 1px solid rgba(59, 130, 246, 0.5);
        border-radius: 20px;
        font-family: 'Space Grotesk', sans-serif;
        box-shadow: 0 0 25px rgba(59, 130, 246, 0.3);
    }
    :global(body.theme-cosmic) .quest-modal-header h3 {
        color: #60a5fa;
    }
    :global(body.theme-cosmic) .highlight {
        color: #60a5fa;
    }
    :global(body.theme-cosmic) .quest-modal-header,
    :global(body.theme-cosmic) .quest-modal-footer {
        border-color: rgba(59, 130, 246, 0.2);
    }

    :global(body.theme-arcade) .quest-modal-card {
        background: #080510;
        border: 4px double #fbbf24;
        border-radius: 0;
        font-family: 'Press Start 2P', monospace;
    }
    :global(body.theme-arcade) .quest-modal-header h3 {
        color: #fbbf24;
        font-size: 0.65rem;
    }
    :global(body.theme-arcade) .quest-modal-body {
        font-size: 0.55rem;
    }
    :global(body.theme-arcade) .quest-steps li strong {
        font-size: 0.6rem;
        color: #fbbf24;
    }
    :global(body.theme-arcade) .quest-steps li p {
        font-size: 0.5rem;
    }
    :global(body.theme-arcade) .highlight {
        color: #fbbf24;
    }
    :global(body.theme-arcade) .quest-modal-header,
    :global(body.theme-arcade) .quest-modal-footer {
        border-color: #fbbf24;
    }

    /* ── Existing style definitions continue ────────────────────── */

    /* ── Portal card ────────────────────────────────────────────── */
    .portal-card {
        position: relative;
        width: 100%;
        max-width: 420px;
    }
    .rune-border {
        position: absolute;
        inset: -3px;
        border-radius: 26px;
        background: linear-gradient(135deg, #f0c060, #a855f7, #3b82f6, #10b981, #f0c060);
        background-size: 300% 300%;
        animation: borderGlow 4s ease infinite;
        z-index: 0;
    }
    @keyframes borderGlow {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    .card-inner {
        position: relative;
        z-index: 1;
        background: rgba(8, 16, 36, 0.88);
        backdrop-filter: blur(20px);
        border-radius: 24px;
        padding: 36px 28px;
    }

    .text-center { text-align: center; }

    /* ── Title & text ───────────────────────────────────────────── */
    .game-title-icon {
        font-size: 3.5rem;
        margin-bottom: 12px;
        filter: drop-shadow(0 0 20px rgba(240, 192, 96, 0.7));
        animation: iconFloat 3s ease-in-out infinite;
    }
    @keyframes iconFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
    }
    .title-text {
        font-family: 'Cinzel Decorative', serif;
        font-size: 2rem;
        font-weight: 900;
        background: linear-gradient(135deg, #f0c060, #ffd700, #f0c060);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: shimmer 3s linear infinite;
        margin: 0 0 8px 0;
        text-shadow: none;
        line-height: 1.2;
    }
    @keyframes shimmer {
        0% { background-position: 0% center; }
        100% { background-position: 200% center; }
    }
    .subtitle-text {
        color: rgba(200, 215, 255, 0.75);
        font-family: 'Cinzel', serif;
        font-size: 0.9rem;
        line-height: 1.6;
        margin: 0 0 20px 0;
    }
    .room-id {
        color: #f0c060;
        font-weight: 700;
        font-family: 'Cinzel Decorative', serif;
    }

    /* ── RPG Buttons ────────────────────────────────────────────── */
    .rpg-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        padding: 14px 20px;
        border: none;
        border-radius: 14px;
        font-family: 'Cinzel', serif;
        font-weight: 700;
        font-size: 0.95rem;
        letter-spacing: 0.04em;
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
        overflow: hidden;
        margin-bottom: 10px;
    }
    .rpg-btn::before {
        content: '';
        position: absolute;
        top: 0; left: -100%;
        width: 60%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
        transition: left 0.4s;
    }
    .rpg-btn:hover::before { left: 160%; }
    .rpg-btn:active { transform: scale(0.97); }
    .rpg-btn:disabled { opacity: 0.5; pointer-events: none; }

    .rpg-btn-primary {
        background: linear-gradient(135deg, #b8860b, #ffd700, #b8860b);
        background-size: 200% auto;
        color: #1a0e00;
        box-shadow: 0 4px 20px rgba(255, 215, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.3);
        text-shadow: 0 1px 0 rgba(255,255,255,0.3);
        animation: btnShimmer 3s linear infinite;
    }
    @keyframes btnShimmer {
        0% { background-position: 0% center; }
        100% { background-position: 200% center; }
    }
    .rpg-btn-primary:hover { box-shadow: 0 6px 30px rgba(255, 215, 0, 0.55); }

    .rpg-btn-wa {
        background: linear-gradient(135deg, #128c7e, #25d366);
        color: white;
        box-shadow: 0 4px 16px rgba(37, 211, 102, 0.35);
    }
    .rpg-btn-wa:hover { box-shadow: 0 6px 24px rgba(37, 211, 102, 0.5); }

    .rpg-btn-ghost {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(240, 192, 96, 0.3);
        color: rgba(200, 215, 255, 0.7);
        font-size: 0.85rem;
    }
    .rpg-btn-ghost:hover {
        border-color: rgba(240, 192, 96, 0.6);
        color: #f0c060;
        background: rgba(240, 192, 96, 0.08);
    }

    .rpg-btn-spin {
        background: linear-gradient(135deg, #7c3aed, #4f46e5, #7c3aed);
        background-size: 200% auto;
        color: white;
        font-size: 1.1rem;
        font-weight: 900;
        letter-spacing: 0.1em;
        padding: 18px;
        border-radius: 999px;
        max-width: 300px;
        box-shadow: 0 8px 30px rgba(109, 40, 217, 0.5), 0 0 60px rgba(109, 40, 217, 0.2);
        animation: btnShimmer 2s linear infinite;
        margin: 0 auto;
    }
    .rpg-btn-spin:hover { box-shadow: 0 12px 40px rgba(109, 40, 217, 0.7); }

    /* ── Form fields ────────────────────────────────────────────── */
    .rpg-label {
        display: block;
        font-family: 'Cinzel', serif;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #f0c060;
        margin-bottom: 8px;
    }
    .rpg-input {
        width: 100%;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(240, 192, 96, 0.3);
        border-radius: 12px;
        padding: 13px 16px;
        color: white;
        font-family: 'Cinzel', serif;
        font-size: 0.95rem;
        outline: none;
        box-sizing: border-box;
        transition: all 0.2s;
    }
    .rpg-input:focus {
        border-color: #f0c060;
        box-shadow: 0 0 0 3px rgba(240, 192, 96, 0.2);
    }
    .rpg-input::placeholder { color: rgba(200, 215, 255, 0.3); }

    .gender-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 8px;
    }
    .gender-btn {
        padding: 12px 6px;
        border-radius: 12px;
        color: white;
        font-family: 'Cinzel', serif;
        font-weight: 700;
        font-size: 0.78rem;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
    }
    .gender-btn:active { transform: scale(0.95); }

    .error-text {
        color: #fca5a5;
        font-family: 'Cinzel', serif;
        font-size: 0.82rem;
        margin-top: 10px;
        text-align: center;
    }

    /* ── Lobby ──────────────────────────────────────────────────── */
    .player-name-highlight {
        color: #f0c060;
        font-weight: 700;
        font-family: 'Cinzel Decorative', serif;
    }
    .player-count {
        color: #86efac;
        font-weight: 600;
    }
    .players-list {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: center;
        margin: 16px 0 24px;
    }
    .player-chip {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 58px;
        height: 58px;
        border-radius: 999px;
        border: 2px solid rgba(255,255,255,0.3);
        color: white;
        font-family: 'Cinzel Decorative', serif;
    }
    .chip-letter {
        font-size: 1.4rem;
        font-weight: 900;
        line-height: 1;
    }
    .chip-name {
        font-size: 0.5rem;
        font-family: 'Cinzel', serif;
        opacity: 0.8;
        margin-top: 2px;
    }
    .hint-text {
        font-family: 'Cinzel', serif;
        color: rgba(200, 215, 255, 0.4);
        font-size: 0.72rem;
        text-align: center;
        margin-top: 10px;
    }
    .code-hint {
        color: #f0c060;
        background: rgba(240, 192, 96, 0.1);
        padding: 1px 6px;
        border-radius: 6px;
        font-family: monospace;
    }

    /* ── Game screen ────────────────────────────────────────────── */
    .game-screen {
        justify-content: space-between;
        padding: 24px 16px 32px;
    }
    .game-header {
        text-align: center;
        padding-top: 12px;
    }
    .game-main-title {
        font-family: 'Cinzel Decorative', serif;
        font-size: 2.2rem;
        font-weight: 900;
        background: linear-gradient(135deg, #f0c060, #ffd700, #f0c060);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: shimmer 3s linear infinite;
        margin: 0;
        text-shadow: none;
        filter: drop-shadow(0 0 20px rgba(240,192,96,0.4));
    }
    .game-subtitle {
        font-family: 'Cinzel', serif;
        color: rgba(200, 215, 255, 0.6);
        font-size: 0.82rem;
        margin-top: 4px;
    }

    /* ── Arena ──────────────────────────────────────────────────── */
    .arena {
        position: relative;
        width: 300px;
        height: 300px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto;
    }
    .player-avatar {
        position: absolute;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Cinzel Decorative', serif;
        font-weight: 900;
        font-size: 1.2rem;
        color: white;
        border: 3px solid rgba(255,255,255,0.4);
        transition: all 0.3s;
    }
    .player-avatar--selected {
        border-color: gold !important;
        animation: selectedPulse 1s ease-in-out infinite;
    }
    @keyframes selectedPulse {
        0%, 100% { box-shadow: 0 0 0 3px rgba(255,215,0,0.3), 0 0 20px gold; }
        50% { box-shadow: 0 0 0 8px rgba(255,215,0,0.1), 0 0 40px gold; }
    }

    .bottle-wrap {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
    }
    .bottle-glow {
        position: absolute;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(109,40,217,0.5), transparent 70%);
        animation: glowPulse 2s ease-in-out infinite;
    }
    @keyframes glowPulse {
        0%, 100% { transform: scale(1); opacity: 0.7; }
        50% { transform: scale(1.4); opacity: 1; }
    }
    .bottle {
        font-size: 2.5rem;
        filter: drop-shadow(0 0 15px rgba(109,40,217,0.8));
        position: relative;
        z-index: 1;
        transform-origin: center;
    }

    /* ── Result ─────────────────────────────────────────────────── */
    .result-area {
        width: 100%;
        max-width: 400px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
    }
    .result-card {
        width: 100%;
        background: rgba(8, 16, 36, 0.9);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(240, 192, 96, 0.3);
        border-radius: 20px;
        padding: 20px;
        box-shadow: 0 0 30px rgba(240, 192, 96, 0.15);
    }
    .result-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
    }
    .result-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-family: 'Cinzel Decorative', serif;
        font-weight: 900;
        font-size: 1rem;
        flex-shrink: 0;
    }
    .result-name {
        font-family: 'Cinzel Decorative', serif;
        font-size: 1.1rem;
        color: #f0c060;
        margin: 0;
    }
    .result-question {
        font-family: 'Cinzel', serif;
        color: rgba(220, 230, 255, 0.9);
        line-height: 1.6;
        margin: 0;
        font-size: 0.92rem;
    }

    .animate-slide-up {
        animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes slideUp {
        from { opacity: 0; transform: translateY(28px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ── Ad pill ────────────────────────────────────────────────── */
    .ad-pill {
        position: fixed;
        bottom: 12px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(8, 16, 36, 0.8);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(240,192,96,0.2);
        border-radius: 999px;
        padding: 4px 10px 4px 8px;
        z-index: 50;
        opacity: 0.8;
    }
    .ad-label {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: .08em;
        color: #f0c060;
        text-transform: uppercase;
        font-family: 'Cinzel', serif;
    }

    .w-full { width: 100%; }
    .mb-1 { margin-bottom: 4px; }
    .mt-5 { margin-top: 20px; }
    .text-sm { font-size: 0.875rem; }
    .text-center { text-align: center; }
</style>
