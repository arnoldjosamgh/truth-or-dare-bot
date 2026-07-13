<script>
    import { onMount } from "svelte";
    import gsap from "gsap";

    // ─── State ────────────────────────────────────────────────────────────────
    let phase = "whatsapp";   // "whatsapp" → "join" → "lobby" → "game"
    let roomId = "";
    let botNumber = import.meta.env.VITE_BOT_NUMBER || "254700000000"; // set in .env

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

    // ─── Lifecycle ────────────────────────────────────────────────────────────
    onMount(async () => {
        // Parse room ID from hash: /#/game/ROOMID
        const parts = window.location.hash.replace("#", "").split("/").filter(Boolean);
        roomId = parts[parts.length - 1] ?? "";
    });

    // ─── WhatsApp open prompt ─────────────────────────────────────────────────
    const openInWhatsApp = () => {
        const url = `https://wa.me/${botNumber}?text=${encodeURIComponent("!startgame")}`;
        window.open(url, "_blank");
        phase = "join";
    };

    const skipToJoin = () => { phase = "join"; };

    // ─── Join form ────────────────────────────────────────────────────────────
    const submitJoin = async () => {
        joinError = "";
        if (!name.trim()) { joinError = "Please enter your name."; return; }
        if (!gender)       { joinError = "Please select your gender."; return; }

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

<!-- ═══════════════════════════════════════════════════════════════════════════
     PHASE: Open in WhatsApp
════════════════════════════════════════════════════════════════════════════ -->
{#if phase === "whatsapp"}
<div class="screen bg-gradient-to-br from-[#0f1728] via-[#1a2540] to-[#0f1728]">
    <div class="card max-w-sm mx-auto text-center">
        <div class="text-6xl mb-4">🍾</div>
        <h1 class="text-3xl font-extrabold text-white mb-2">Spin the Bottle</h1>
        <p class="text-slate-400 mb-8 leading-relaxed">
            You've been invited to a game!<br>
            Open WhatsApp to join your group, then come back here.
        </p>

        <button on:click={openInWhatsApp} class="btn-wa w-full mb-3">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.116.554 4.127 1.528 5.877L0 24l6.266-1.513A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.012-1.372l-.36-.214-3.72.898.938-3.63-.235-.375A9.818 9.818 0 1112 21.818z"/>
            </svg>
            Open WhatsApp
        </button>

        <button on:click={skipToJoin} class="btn-ghost w-full text-sm">
            Already in the group → Enter my name
        </button>
    </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════════════════
     PHASE: Join Form
════════════════════════════════════════════════════════════════════════════ -->
{:else if phase === "join"}
<div class="screen bg-gradient-to-br from-[#0f1728] via-[#1a2540] to-[#0f1728]">
    <div class="card max-w-sm mx-auto">
        <div class="text-4xl mb-2 text-center">🎮</div>
        <h2 class="text-2xl font-extrabold text-white text-center mb-1">Join the Game</h2>
        <p class="text-slate-400 text-center text-sm mb-6">Room <span class="text-blue-400 font-mono">{roomId}</span></p>

        <label class="field-label">Your Name</label>
        <input
            bind:value={name}
            placeholder="e.g. Alex"
            class="field-input"
            maxlength="32"
            on:keydown={e => e.key === "Enter" && submitJoin()}
        />

        <label class="field-label mt-4">Gender</label>
        <div class="gender-grid">
            {#each [["M","♂ Male","from-blue-500 to-blue-700"], ["F","♀ Female","from-pink-500 to-pink-700"], ["O","⚡ Other","from-purple-500 to-purple-700"]] as [val, label, grad]}
                <button
                    on:click={() => gender = val}
                    class="gender-btn {gender === val ? `ring-2 ring-white bg-gradient-to-br ${grad}` : 'bg-white/10'}"
                >{label}</button>
            {/each}
        </div>

        {#if joinError}
            <p class="text-red-400 text-sm mt-3 text-center">{joinError}</p>
        {/if}

        <button
            on:click={submitJoin}
            disabled={joining}
            class="btn-primary w-full mt-6"
        >
            {joining ? "Joining..." : "Join Game →"}
        </button>
    </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════════════════
     PHASE: Lobby (waiting for host to spin)
════════════════════════════════════════════════════════════════════════════ -->
{:else if phase === "lobby"}
<div class="screen bg-gradient-to-br from-[#0f1728] via-[#1a2540] to-[#0f1728]">
    <div class="card max-w-sm mx-auto text-center">
        <div class="text-5xl mb-4">✅</div>
        <h2 class="text-2xl font-extrabold text-white mb-2">You're in!</h2>
        <p class="text-slate-400 mb-6">
            <span class="text-green-400 font-bold">{name}</span> joined the lobby.<br>
            {players.length} player{players.length !== 1 ? "s" : ""} ready.
        </p>

        <div class="players-list mb-6">
            {#each players as p, i}
                <div class="player-chip" style="background: hsl({i * 47}, 70%, 55%)">
                    {p.name[0]}
                    <span class="text-xs">{p.name}</span>
                </div>
            {/each}
        </div>

        <button on:click={startGame} class="btn-primary w-full">
            Start Spinning 🍾
        </button>
        <p class="text-slate-500 text-xs mt-3">The host can also spin from WhatsApp with <code class="text-blue-400">!spin</code></p>
    </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════════════════
     PHASE: Game
════════════════════════════════════════════════════════════════════════════ -->
{:else}
<div class="screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 text-gray-900 flex flex-col items-center justify-between p-6 pb-24">

    <!-- Header -->
    <div class="w-full max-w-md mt-8 mb-4">
        <h1 class="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Spin the<br>Bottle
        </h1>
        <p class="text-gray-500 mt-1 text-sm">{players.length} players · Round {spinCount + 1}</p>
    </div>

    <!-- Players Circle + Bottle -->
    <div class="relative w-[320px] h-[320px] flex items-center justify-center my-6">
        {#each players as player, i}
            <div
                class="absolute flex flex-col items-center justify-center w-16 h-16 rounded-full shadow-lg border-4 border-white font-bold text-xl"
                style="
                    background: hsl({(360 / players.length) * i * 2}, 80%, 62%);
                    color: white;
                    transform: rotate({(360 / players.length) * i}deg) translate(140px) rotate(-{(360 / players.length) * i}deg);
                    {selectedPlayer?.name === player.name ? 'box-shadow: 0 0 0 4px white, 0 0 0 6px #6d28d9;' : ''}
                "
            >{player.name[0]}</div>
        {/each}

        <div class="bottle w-12 h-32 bg-gradient-to-b from-blue-400 to-blue-700 rounded-t-full rounded-b-xl shadow-2xl shadow-blue-400/40 flex flex-col items-center z-10 border-2 border-white/20">
            <div class="w-4 h-9 bg-gradient-to-b from-gray-200 to-gray-300 rounded-t-lg -mt-4 border-2 border-white/40"></div>
            <div class="w-8 h-2 bg-white/20 rounded-full mt-2"></div>
        </div>
    </div>

    <!-- Result card -->
    <div class="w-full max-w-md flex flex-col items-center mt-auto">
        {#if selectedPlayer && question}
            <div class="w-full mb-6 p-6 bg-white/90 backdrop-blur-xl border border-white/50 rounded-[28px] shadow-2xl animate-slide-up">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold"
                         style="background: #7c3aed">{selectedPlayer.name[0]}</div>
                    <h2 class="text-xl font-extrabold text-gray-800">{selectedPlayer.name}'s turn!</h2>
                </div>
                <p class="text-gray-700 leading-relaxed font-medium">{question}</p>
            </div>
        {/if}

        <button
            on:click={spinBottle}
            disabled={isSpinning || players.length < 2}
            class="btn-spin"
        >
            {isSpinning ? "SPINNING..." : "SPIN BOTTLE"}
        </button>

        {#if players.length < 2}
            <p class="text-gray-500 text-xs mt-2">Need at least 2 players to spin.</p>
        {/if}
    </div>
</div>

<!-- Silent sticky ad — only every 5th spin -->
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
    :global(body) { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; }

    .screen {
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px 16px;
    }

    .card {
        width: 100%;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 28px;
        padding: 32px 24px;
        backdrop-filter: blur(12px);
    }

    .field-label {
        display: block;
        color: #94a3b8;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: .06em;
        text-transform: uppercase;
        margin-bottom: 6px;
    }

    .field-input {
        width: 100%;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 14px;
        padding: 12px 16px;
        color: white;
        font-size: 16px;
        outline: none;
        box-sizing: border-box;
        transition: border-color .2s;
    }
    .field-input:focus { border-color: #6d28d9; }
    .field-input::placeholder { color: #475569; }

    .gender-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 8px;
    }
    .gender-btn {
        padding: 10px 6px;
        border-radius: 14px;
        border: none;
        color: white;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        transition: all .15s;
    }
    .gender-btn:active { transform: scale(.95); }

    .btn-primary {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 14px;
        background: linear-gradient(135deg, #6d28d9, #4f46e5);
        color: white;
        font-weight: 800;
        font-size: 16px;
        border: none;
        border-radius: 999px;
        cursor: pointer;
        transition: opacity .2s, transform .1s;
    }
    .btn-primary:active { transform: scale(.97); }
    .btn-primary:disabled { opacity: .5; pointer-events: none; }

    .btn-wa {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 14px;
        background: #25d366;
        color: white;
        font-weight: 800;
        font-size: 16px;
        border: none;
        border-radius: 999px;
        cursor: pointer;
        transition: opacity .2s;
    }
    .btn-wa:hover { opacity: .9; }

    .btn-ghost {
        background: transparent;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 999px;
        padding: 10px;
        color: #94a3b8;
        cursor: pointer;
        transition: border-color .2s;
    }
    .btn-ghost:hover { border-color: rgba(255,255,255,.3); }

    .players-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
    }
    .player-chip {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 52px;
        height: 52px;
        border-radius: 999px;
        font-weight: 800;
        font-size: 18px;
        color: white;
        border: 3px solid rgba(255,255,255,0.3);
    }

    .btn-spin {
        width: 100%;
        max-width: 260px;
        padding: 16px;
        background: linear-gradient(135deg, #3b82f6, #7c3aed);
        color: white;
        font-weight: 900;
        font-size: 18px;
        border: none;
        border-radius: 999px;
        cursor: pointer;
        box-shadow: 0 10px 30px -10px rgba(109,40,217,.5);
        transition: transform .1s, opacity .2s;
    }
    .btn-spin:active { transform: scale(.96); }
    .btn-spin:disabled { opacity: .5; pointer-events: none; }

    .animate-slide-up {
        animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes slideUp {
        from { opacity: 0; transform: translateY(32px) scale(.96); }
        to   { opacity: 1; transform: translateY(0)    scale(1);   }
    }

    /* Discreet sticky ad pill */
    .ad-pill {
        position: fixed;
        bottom: 12px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(255,255,255,.55);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255,255,255,.4);
        border-radius: 999px;
        padding: 4px 10px 4px 8px;
        box-shadow: 0 2px 12px rgba(0,0,0,.07);
        z-index: 50;
        opacity: 0.75;
        transition: opacity .2s;
    }
    .ad-pill:hover { opacity: 1; }
    .ad-label {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: .08em;
        color: #9ca3af;
        text-transform: uppercase;
        user-select: none;
    }
</style>
