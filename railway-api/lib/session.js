var a=(e,s)=>()=>(s||e((s={exports:{}}).exports,s),s.exports);var d=a((b,l)=>{var o=require("crypto"),u="scrypt",E=32,T=e=>{let s=o.randomBytes(16).toString("hex"),t=o.scryptSync(e,s,64).toString("hex");return`${u}$${s}$${t}`},w=(e,s="")=>{let[t,n,r]=String(s).split("$");if(t!==u||!n||!r)return!1;let i=o.scryptSync(e,n,64),c=Buffer.from(r,"hex");return i.length!==c.length?!1:o.timingSafeEqual(i,c)},x=()=>o.randomBytes(E).toString("hex"),C=e=>o.createHash("sha256").update(String(e||"")).digest("hex");l.exports={createSessionToken:x,hashPassword:T,hashSessionToken:C,verifyPassword:w}});var h=a((F,S)=>{var I=(e,s,t)=>e.status(s).json(t);S.exports={json:I}});var A=a((j,p)=>{var k=["cliperedbagundol@gmail.com"],N=["cliperedbagundol@gmail.com"],O={courseClubMonthly:"course-club",flagshipCourseOneTime:"flagship-course"},L={planCode:"courseClubMonthly",maxRedemptions:10,discountPercent:30,regularAmountCents:99900,discountedAmountCents:69900,currency:"PHP"},R=e=>{let s=String(e||"").trim().toLowerCase();return s&&(s==="recruitment_agency"||s==="individual")?s:null},m=()=>Array.from(new Set([...k,...String(process.env.ADMIN_EMAILS||"").split(",").map(e=>e.trim().toLowerCase()).filter(Boolean)])),_=e=>m().includes(String(e||"").trim().toLowerCase()),U=e=>N.includes(String(e||"").trim().toLowerCase()),v=e=>_(e)?"admin":"member";p.exports={SESSION_DURATION_DAYS:30,PLAN_TO_COURSE:O,COURSE_CLUB_LAUNCH_OFFER:L,normalizeAccountType:R,getAdminEmails:m,isAdminEmail:_,isTestAccessEmail:U,getUserRole:v}});var{createSessionToken:D,hashSessionToken:g}=d(),{json:$}=h(),{SESSION_DURATION_DAYS:q}=A(),P=(e,s,t)=>{let n=process.env.RAILWAY_INTERNAL_SECRET||"";if(!n)return t();let r=e.headers.authorization||"";return(r.startsWith("Bearer ")?r.slice(7):"")!==n?$(s,401,{error:"Unauthorized."}):t()},f=e=>String(e.headers["x-session-token"]||e.headers["x-clipdevs-session"]||String(e.headers.cookie||"").split(";").map(s=>s.trim()).find(s=>s.startsWith("clipdevs_session="))?.split("=").slice(1).join("=")||"").trim(),B=async(e,s)=>{let t=D(),n=g(t);return await e.query(`
      insert into user_sessions (user_id, token_hash, expires_at)
      values ($1, $2, now() + interval '30 days')
    `,[s,n]),{sessionToken:t,expiresInDays:q}},y=async(e,s)=>{let t=f(s);if(!t)return null;let n=g(t),r=await e.query(`
      select u.id, u.email, u.full_name, u.status, s.id as session_id
      from user_sessions s
      join users u on u.id = s.user_id
      where s.token_hash = $1
        and s.revoked_at is null
        and s.expires_at > now()
      limit 1
    `,[n]);return r.rows.length?(await e.query(`
      update user_sessions
      set last_used_at = now()
      where id = $1
    `,[r.rows[0].session_id]),r.rows[0]):null},H=async(e,s,t)=>{let n=await y(e,s);return n?t(n.email)?{authUser:n}:{error:"Admin access required.",status:403}:{error:"Not authenticated.",status:401}};module.exports={requireInternalSecret:P,getSessionTokenFromHeaders:f,createSessionForUser:B,getAuthenticatedUser:y,getAuthenticatedAdmin:H};
