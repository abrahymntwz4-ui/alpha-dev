/* Alpha.Dev frontend. Requires config.js and Supabase JS v2. */
(() => {
  const cfg = window.ALPHA_CONFIG || {};
  const ready = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("YOUR-PROJECT") && !cfg.SUPABASE_ANON_KEY.includes("YOUR_");
  const $ = id => document.getElementById(id);
  const supabase = ready ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  let currentUser = null, currentProfile = null, games = [];

  $("year").textContent = new Date().getFullYear();
  const say = (id, message) => { const el=$(id); if(el) el.textContent=message; };
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const showDialog = id => $(id).showModal();
  const closeDialog = id => $(id).close();

  function configWarning() {
    $("game-list").innerHTML = '<div class="empty">أكمل إعداد config.js حسب README_AR.md لربط قاعدة البيانات.</div>';
    $("auth-button").addEventListener("click", () => alert("أكمل إعداد Supabase أولاً. راجع README_AR.md"));
  }
  if (!ready) { configWarning(); return; }

  $("auth-button").addEventListener("click", async () => {
    if (!currentUser) showDialog("auth-dialog");
    else if (confirm("هل تريد تسجيل الخروج؟")) await supabase.auth.signOut();
  });
  $("google-login").addEventListener("click", async () => {
    say("auth-status","جارٍ تحويلك إلى Google...");
    const {error} = await supabase.auth.signInWithOAuth({
      provider:"google",
      options:{redirectTo:location.origin + location.pathname}
    });
    if(error) say("auth-status",error.message);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
    setTimeout(refreshAccount,0);
  });
  async function refreshAccount() {
    if (!currentUser) {
      currentProfile=null; $("auth-button").textContent="تسجيل الدخول"; $("user-chip").textContent="";
      $("profile-area").textContent="سجّل الدخول لعرض ملفك وتعديله.";
      await loadGames(); return;
    }
    $("auth-button").textContent="تسجيل الخروج";
    const {data,error}=await supabase.from("profiles").select("*").eq("id",currentUser.id).maybeSingle();
    if(error){say("profile-area","تعذر تحميل الملف: "+error.message);return;}
    currentProfile=data;
    if(!data){
      const suggested=(currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "developer").replace(/[^A-Za-z0-9_]/g,"").slice(0,16) || "developer";
      $("display-name").value=currentUser.user_metadata?.full_name || "";
      $("username").value=suggested.length>=3?suggested:"developer";
      showDialog("profile-dialog");
    } else renderProfile();
    await loadGames();
  }
  $("profile-form").addEventListener("submit",async e=>{
    e.preventDefault(); if(!currentUser)return;
    const display_name=$("display-name").value.trim(), username=$("username").value.trim();
    if(!/^[A-Za-z0-9_]{3,20}$/.test(username)){say("profile-status","اسم المستخدم يجب أن يكون 3-20 حرفاً إنجليزياً أو رقماً أو _.");return;}
    say("profile-status","جارٍ حفظ الملف...");
    const {error}=await supabase.from("profiles").insert({id:currentUser.id,display_name,username});
    if(error){say("profile-status",error.code==="23505"?"اسم المستخدم مستخدم، اختر اسماً آخر.":error.message);return;}
    closeDialog("profile-dialog"); await refreshAccount();
  });
  function renderProfile(){
    if(!currentProfile)return;
    $("profile-area").innerHTML=`<div class="profile-row"><div class="avatar">👤</div><div><b>${esc(currentProfile.display_name)}</b><div class="muted">@${esc(currentProfile.username)}</div></div></div><p>${esc(currentProfile.bio||"لم يضف نبذة بعد.")}</p><div class="profile-games"><b>ألعابك المنشورة أو قيد المراجعة</b><div id="my-games" class="muted">تظهر ألعابك ضمن القائمة أدناه.</div></div>`;
  }

  async function loadGames(){
    const {data,error}=await supabase.from("games").select("id,title,description,category,cover_url,developer_id,file_size_bytes,downloads_count,created_at,profiles(display_name,username),game_ratings(rating)").eq("status","published").order("created_at",{ascending:false}).limit(60);
    if(error){$("game-list").innerHTML=`<div class="empty">تعذر تحميل الألعاب: ${esc(error.message)}</div>`;return;}
    games=data||[]; renderGames();
  }
  function renderGames(){
    const q=$("search").value.trim().toLowerCase();
    const filtered=games.filter(g=>(g.title+" "+(g.profiles?.display_name||"")+" "+(g.profiles?.username||"")).toLowerCase().includes(q));
    $("game-list").innerHTML=filtered.length?filtered.map(g=>{
      const avg=g.game_ratings?.length?(g.game_ratings.reduce((a,r)=>a+r.rating,0)/g.game_ratings.length).toFixed(1):"—";
      const cover=g.cover_url?`<img src="${esc(g.cover_url)}" alt="غلاف ${esc(g.title)}">`:"🎮";
      return `<article class="game-card"><div class="cover">${cover}</div><div class="game-content"><h3>${esc(g.title)}</h3><p>${esc(g.description||"لا يوجد وصف.")}</p><div class="meta"><span>👤 ${esc(g.profiles?.display_name||"مطوّر")}</span><span class="stars">★ ${avg}</span></div><div class="meta"><span>⬇ ${g.downloads_count||0}</span><span>${(g.file_size_bytes/1048576).toFixed(1)} MB</span></div><div class="card-actions"><button data-detail="${g.id}">التفاصيل والتنزيل</button></div></div></article>`;
    }).join(""):'<div class="empty">لا توجد ألعاب منشورة تطابق بحثك حالياً.</div>';
    document.querySelectorAll("[data-detail]").forEach(b=>b.addEventListener("click",()=>openGame(b.dataset.detail)));
  }
  $("search").addEventListener("input",renderGames);

  async function openGame(id){
    const g=games.find(x=>x.id===id); if(!g)return;
    const avg=g.game_ratings?.length?(g.game_ratings.reduce((a,r)=>a+r.rating,0)/g.game_ratings.length).toFixed(1):"لا يوجد";
    $("game-detail").innerHTML=`<h2>${esc(g.title)}</h2><p>${esc(g.description||"لا يوجد وصف.")}</p><div class="detail-meta"><span>المطوّر: ${esc(g.profiles?.display_name||"")}</span><span>التقييم: ★ ${avg}</span><span>الحجم: ${(g.file_size_bytes/1048576).toFixed(1)} MB</span></div><hr><label>قيّم اللعبة <select id="rating-input"><option value="">اختر من 1 إلى 5</option>${[1,2,3,4,5].map(n=>`<option value="${n}">${n} نجوم</option>`).join("")}</select></label><button id="rate-button" class="secondary">حفظ التقييم</button><h3>التعليقات</h3><div id="comments">جارٍ التحميل...</div><form id="comment-form"><textarea id="comment-body" maxlength="1000" required placeholder="اكتب تعليقاً محترماً..."></textarea><button>إضافة تعليق</button></form><button id="download-button">تنزيل اللعبة</button><p class="tiny muted">يتم تنزيل ملف ZIP إلى جهازك. لا يتم تشغيل اللعبة داخل Alpha.Dev.</p>`;
    showDialog("game-dialog");
    $("rate-button").onclick=async()=>{if(!currentUser)return alert("سجّل الدخول أولاً.");const rating=Number($("rating-input").value);if(!rating)return;const {error}=await supabase.from("game_ratings").upsert({game_id:id,user_id:currentUser.id,rating},{onConflict:"game_id,user_id"});alert(error?error.message:"تم حفظ تقييمك.");};
    $("comment-form").onsubmit=async e=>{e.preventDefault();if(!currentUser)return alert("سجّل الدخول أولاً.");const body=$("comment-body").value.trim();const {error}=await supabase.from("comments").insert({game_id:id,user_id:currentUser.id,body});if(error)alert(error.message);else{ $("comment-body").value="";loadComments(id);}};
    $("download-button").onclick=async()=>{if(!currentUser)return alert("سجّل الدخول لتنزيل اللعبة.");const {data,error}=await supabase.functions.invoke("download-game",{body:{game_id:id}});if(error||!data?.url){alert("تعذر تجهيز رابط التنزيل. تأكد من نشر وظيفة download-game.");return;}location.href=data.url;};
    loadComments(id);
  }
  async function loadComments(gameId){
    const {data,error}=await supabase.from("comments").select("id,body,created_at,profiles(display_name)").eq("game_id",gameId).order("created_at",{ascending:false}).limit(40);
    $("comments").innerHTML=error?`<p class="muted">${esc(error.message)}</p>`:(data?.length?data.map(c=>`<p><b>${esc(c.profiles?.display_name||"مستخدم")}</b><br>${esc(c.body)}</p>`).join(""):'<p class="muted">لا توجد تعليقات بعد.</p>');
  }

  $("publish-form").addEventListener("submit",async e=>{
    e.preventDefault();if(!currentUser)return alert("سجّل الدخول أولاً.");
    const file=$("game-zip").files[0];if(!file)return;
    if(!file.name.toLowerCase().endsWith(".zip")||file.size>100*1024*1024||file.size===0){say("publish-status","اختر ملف ZIP صالحاً حجمه أقل من 100MB.");return;}
    // Basic ZIP signature check. This is not malware scanning or archive validation.
    const sig=new Uint8Array(await file.slice(0,4).arrayBuffer());
    if(!(sig[0]===0x50&&sig[1]===0x4b)){say("publish-status","الملف لا يبدو كأرشيف ZIP صالح.");return;}
    say("publish-status","جارٍ رفع الملف...");
    const path=`${currentUser.id}/${crypto.randomUUID()}.zip`;
    const up=await supabase.storage.from("game-zips").upload(path,file,{contentType:"application/zip",upsert:false});
    if(up.error){say("publish-status",up.error.message);return;}
    const {error}=await supabase.from("games").insert({
      developer_id:currentUser.id,title:$("game-title").value.trim(),
      description:$("game-description").value.trim(),category:$("game-category").value,
      cover_url:$("game-cover").value.trim()||null,storage_path:path,file_size_bytes:file.size,status:"pending"
    });
    if(error){await supabase.storage.from("game-zips").remove([path]);say("publish-status",error.message);return;}
    say("publish-status","وصلت لعبتك للمراجعة. ستظهر بعد موافقة الإدارة.");
    e.target.reset();
  });

  refreshAccount();
})();