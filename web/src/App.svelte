<script>
    import { route } from "./lib/router.svelte.js";
    import Login from "./routes/Login.svelte";
    import GroupAdmin from "./routes/GroupAdmin.svelte";
    import Dashboard from "./routes/Dashboard.svelte";
    import Game from "./routes/Game.svelte";
    import Toaster from "./components/Toaster.svelte";
</script>

{#if route.path === "/login"}
    <Login />
{:else if route.path.startsWith("/dashboard")}
    <Dashboard />
{:else if route.path.startsWith("/game")}
    <Game />
{:else}
    <GroupAdmin />
{/if}
<Toaster />
