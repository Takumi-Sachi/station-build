// Pont entre le site et Supabase : il offre à app.js la même interface que celle
// utilisée sur claude.ai (claude.use("user" | "db" | "assets")), branchée sur Supabase.
(function () {
  var LIVE_ID = "draft-live", LIVE_UUID = "00000000-0000-4000-8000-00000000d4af";
  var COLS = ["type","title","text","char","img","vid","link","mode","name","players","steps","answers","tiers","defs","uid","ts"];
  var toDb = function (id) { return id === LIVE_ID ? LIVE_UUID : id; };
  var fromDb = function (id) { return id === LIVE_UUID ? LIVE_ID : id; };
  var sb = null, role = "guest";
  var auth = window.sbAuth = { logged: false, name: "", id: "", role: "guest" };

  function client() {
    if (sb) return sb;
    if (!window.supabase || !window.SB_KEY || /^COLLE/.test(window.SB_KEY)) return null;
    sb = window.supabase.createClient(window.SB_URL, window.SB_KEY);
    return sb;
  }
  function pick(d) { var o = {}; COLS.forEach(function (k) { if (d[k] !== undefined) o[k] = d[k]; }); return o; }
  function need() { if (!auth.logged) throw new Error("Connexion requise"); }

  async function refresh() {
    var c = client();
    if (!c) { console.warn("Supabase : clé manquante dans config.js"); return; }
    var s = (await c.auth.getSession()).data.session;
    if (!s) { auth.logged = false; auth.id = ""; auth.name = ""; role = "guest"; auth.role = role; return; }
    var m = s.user.user_metadata || {};
    auth.logged = true; auth.id = s.user.id;
    auth.name = (m.custom_claims && m.custom_claims.global_name) || m.full_name || m.name || m.preferred_username || "Discord";
    var r = await c.rpc("my_role");
    role = (r.data === "admin" || r.data === "member") ? r.data : "guest";
    auth.role = role;
  }

  auth.signIn = function () {
    var c = client();
    if (!c) { alert("Clé Supabase manquante : colle-la dans config.js."); return; }
    c.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: location.origin + location.pathname } });
  };
  auth.signOut = async function () { var c = client(); if (c) await c.auth.signOut(); location.reload(); };
  auth.copyId = function () {
    var done = function () { alert("Identifiant copié. Envoie-le à l'admin pour qu'il te donne l'accès membre."); };
    if (navigator.clipboard) navigator.clipboard.writeText(auth.id).then(done, function () { prompt("Copie ton identifiant :", auth.id); });
    else prompt("Copie ton identifiant :", auth.id);
  };

  var userObj = {
    id: async function () { return auth.id; },
    isOwner: async function () { return role === "admin"; },
    canEdit: async function () { return role === "admin"; },
    can: async function (n) { return n === "data.write" ? role !== "guest" : true; }
  };

  var db = {
    collection: function () {
      return {
        add: async function (d) {
          need();
          var row = pick(d); row.uid = auth.id;
          var r = await client().from("posts").insert(row).select("id").single();
          if (r.error) throw r.error;
          return { id: fromDb(r.data.id) };
        },
        onSnapshot: function (cb, err) {
          var c = client(), t = null;
          var load = async function () {
            var r = await c.from("posts").select("*").order("ts", { ascending: false }).limit(1000);
            if (r.error) { if (err) err(r.error); return; }
            cb({ docs: r.data.map(function (row) {
              return { id: fromDb(row.id), data: function () { var o = Object.assign({}, row); delete o.id; return o; } };
            }) });
          };
          load();
          c.channel("posts-live").on("postgres_changes", { event: "*", schema: "public", table: "posts" },
            function () { clearTimeout(t); t = setTimeout(load, 200); }).subscribe();
        }
      };
    },
    doc: function (path) {
      var id = toDb(path.split("/").pop());
      return {
        update: async function (d) {
          var r = await client().from("posts").update(pick(d)).eq("id", id).select("id");
          if (r.error) throw r.error;
          if (!r.data.length) throw new Error("refusé");
        },
        set: async function (d) {
          need();
          var row = pick(d), c = client();
          var u = await c.from("posts").update(row).eq("id", id).select("id");
          if (u.error) throw u.error;
          if (!u.data.length) {
            row.id = id; row.uid = auth.id;
            var i = await c.from("posts").insert(row);
            if (i.error) throw i.error;
          }
        },
        delete: async function () {
          var r = await client().from("posts").delete().eq("id", id).select("id");
          if (r.error) throw r.error;
          if (!r.data.length) throw new Error("refusé");
        }
      };
    }
  };

  var assets = {
    upload: async function (f) {
      need();
      var path = auth.id + "/" + Date.now() + "-" + f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      var c = client();
      var r = await c.storage.from("uploads").upload(path, f, { contentType: f.type });
      if (r.error) throw r.error;
      return { url: c.storage.from("uploads").getPublicUrl(path).data.publicUrl };
    }
  };

  window.claude = {
    use: async function (k) {
      if (k === "user") { await refresh(); return userObj; }
      if (!client()) return null;
      return k === "db" ? db : k === "assets" ? assets : null;
    }
  };
})();
