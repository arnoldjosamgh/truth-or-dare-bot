<script>
    import { onMount } from "svelte";
    import gsap from "gsap";

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
    onMount(async () => {
        const parts = window.location.hash.replace("#", "").split("/").filter(Boolean);
        roomId = parts[parts.length - 1] ?? "";

        // Generate floating rune particles
        particles = Array.from({ length: 18 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: 10 + Math.random() * 18,
            duration: 6 + Math.random() * 8,
            delay: Math.random() * 5,
            symbol: ["✦", "⚔️", "🍾", "✨", "⭐", "🌟", "💫", "🔮", "🎲", "⚡"][Math.floor(Math.random() * 10)],
            opacity: 0.15 + Math.random() * 0.25,
        }));
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

<!-- Floating rune particles -->
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
            <div class="game-title-icon">🍾</div>
            <h1 class="title-text">Spin the Bottle</h1>
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
                <div class="game-title-icon">🎮</div>
                <h2 class="title-text" style="font-size:1.6rem">Join the Quest</h2>
                <p class="subtitle-text text-sm">Room <span class="room-id">{roomId}</span></p>
            </div>

            <label class="rpg-label">⚔️ Your Name, Brave One</label>
            <input
                bind:value={name}
                placeholder="e.g. Arthur"
                class="rpg-input"
                maxlength="32"
                on:keydown={e => e.key === "Enter" && submitJoin()}
            />

            <label class="rpg-label" style="margin-top:1rem">🛡️ Warrior Class</label>
            <div class="gender-grid">
                {#each [["M","♂ Knight","from-blue-600 to-blue-800","#3b82f6"], ["F","♀ Sorceress","from-pink-500 to-rose-700","#ec4899"], ["O","⚡ Rogue","from-violet-600 to-purple-800","#8b5cf6"]] as [val, label, grad, color]}
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
                {joining ? "Entering the realm..." : "⚔️ Join the Battle →"}
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
            <div class="game-title-icon">🏰</div>
            <h2 class="title-text" style="font-size:1.6rem">Adventurers' Hall</h2>
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
                ⚔️ Begin the Ritual 🍾
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
        <h1 class="game-main-title">Spin the Bottle</h1>
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
            <div class="bottle-glow"></div>
            <div class="bottle">🍾</div>
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
            {isSpinning ? "✨ SPINNING..." : "⚔️ SPIN THE BOTTLE"}
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
    /* ── Global reset ───────────────────────────────────────────── */
    :global(body) {
        margin: 0;
        font-family: 'Cinzel', Georgia, serif;
        background-image: url('/images/game-bg.png');
        background-size: cover;
        background-position: center;
        background-attachment: fixed;
        min-height: 100dvh;
        overflow-x: hidden;
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
        padding: 24px 16px;
        position: relative;
        z-index: 1;
        /* dark overlay over background for readability */
        background: linear-gradient(
            to bottom,
            rgba(10, 20, 40, 0.45) 0%,
            rgba(5, 12, 28, 0.55) 100%
        );
    }

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
