# Alpha.Dev — مشروع المنصة

هذه حزمة مصدر قابلة للنشر على GitHub Pages بعد إعداد Supabase وGoogle OAuth. تحتوي واجهة عربية RTL، تطبيق الواجهة، مخطط قاعدة البيانات، ووظائف خادمية أولية.

## مهم قبل البدء
هذه ليست منصة إنتاجية مكتملة بمجرد فك الضغط. لا يمكن تشغيل تسجيل Google أو حفظ ألعاب المستخدمين عبر الإنترنت قبل إنشاء مشروع Supabase وإعداد Google OAuth ونشر وظائف Supabase. كما أن فحص ZIP المتقدم والعزل الأمني ومراجعة RLS واختبارات الأمان ما زالت مطلوبة قبل فتح رفع الملفات للعامة.

## 1) ملفات الحزمة
- `index.html`: واجهة الموقع.
- `styles.css`: التنسيق المتجاوب.
- `app.js`: منطق الواجهة والاتصال بـ Supabase.
- `config.example.js`: نموذج الإعدادات العامة.
- `config.js`: ملف إعداد placeholder؛ ضع فيه Project URL وPublishable/anon key العامين فقط.
- `supabase/schema.sql`: الجداول وسياسات الحماية الأساسية.
- `supabase/functions/download-game`: وظيفة إصدار رابط تنزيل مؤقت.
- `supabase/functions/admin-action`: نقطة بداية لإجراءات إدارية خادمية.
- `.github/workflows/pages.yml`: نشر تلقائي إلى GitHub Pages عند كل تحديث على `main`.

## 2) إعداد Supabase
1. أنشئ مشروعًا جديدًا في https://supabase.com/dashboard .
2. افتح SQL Editor وشغّل كامل الملف `supabase/schema.sql`.
3. من Project Settings ثم API انسخ Project URL وPublishable key (أو anon key).
4. افتح `config.js` وضع القيم في المكانين المحددين. لا تضع أبدًا `service_role` أو Secret key في هذا الملف أو في GitHub.
5. تأكد من وجود bucket خاص باسم `game-zips` وbucket عام باسم `avatars` وفق مخطط SQL.
6. راجع سياسات RLS واختبرها بحسابين مختلفين قبل نشر المنصة للعامة.

## 3) إعداد Google OAuth
1. من Supabase > Authentication > Providers فعّل Google.
2. أنشئ OAuth Client من Google Cloud Console.
3. انسخ Callback URL الذي يعرضه Supabase إلى Authorized redirect URIs في Google Cloud.
4. أضف رابط GitHub Pages النهائي إلى Site URL وRedirect URLs في Supabase.
5. لا تضع Client Secret في الواجهة؛ أدخله فقط في إعدادات مزود Google داخل Supabase.

## 4) نشر الوظائف الخادمية
تحتاج Supabase CLI:
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy download-game
supabase functions deploy admin-action
```
أسرار الخادم تبقى في Supabase Function Secrets. `SUPABASE_SERVICE_ROLE_KEY` سر خادمي فقط؛ لا تضعه في `config.js` أو GitHub Pages.

## 5) النشر على GitHub Pages
1. فك ضغط ZIP على جهازك.
2. ارفع **محتويات المجلد** إلى جذر مستودع GitHub، بحيث يكون `index.html` في الجذر مباشرة وليس داخل مجلد فرعي.
3. ارفع مجلد `.github/workflows` أيضًا.
4. افتح المستودع > Settings > Pages.
5. في Build and deployment اختر **GitHub Actions**.
6. افتح تبويب Actions وانتظر نجاح مهمة Deploy Alpha.Dev.
7. سيظهر رابط الموقع في Settings > Pages.

إذا كان المستودع Project Pages فالرابط غالبًا `https://USERNAME.github.io/REPOSITORY/`. أضفه إلى Supabase Redirect URLs.

## 6) ما الموجود وما يحتاج إكمالًا؟
### موجود في الحزمة
- واجهة عربية RTL متجاوبة.
- ربط تسجيل Google عبر Supabase بعد الإعداد.
- إنشاء ملف مطور باسم مستخدم فريد.
- عرض الألعاب المنشورة والبحث.
- رفع ZIP إلى تخزين خاص مع حد حجم أساسي.
- طلب تنزيل اللعبة عبر رابط موقّع مؤقت.
- أساس التقييمات والتعليقات.
- جداول الرتب والتوثيق والإشعارات والبلاغات.
- وظيفة إدارية خادمية أولية.
- سير عمل GitHub Actions للنشر.

### يحتاج استكمالًا ومراجعة قبل الإطلاق العام
- لوحة إدارة كاملة ومراجعة البلاغات والرتب وإدارة المشرفين.
- واجهات الإعجاب والردود على التعليقات والإشعارات.
- عدّاد تنزيل موثوق.
- فحص ZIP على الخادم ضد الملفات الضارة ومسارات فك الضغط الخبيثة، وحجر الملفات قبل الموافقة.
- استضافة الألعاب ضمن نطاق معزول؛ لا تشغّل محتوى المستخدمين على نفس نطاق الموقع.
- حدود استخدام ومكافحة إساءة الاستخدام ومراجعة محتوى.
- اختبارات أمنية شاملة لسياسات RLS والوظائف وخطة نسخ احتياطي.

## 7) أمان مهم
- لا تنشر مفاتيح الخدمة السرية في GitHub.
- لا تمنح صلاحية admin من المتصفح؛ عيّنها من بيئة موثوقة عبر Supabase Admin API.
- لا تعتمد على فحص ZIP في المتصفح كفحص أمني.
- لا تفتح رفع الملفات للعامة قبل تنفيذ فحص خادمي معزول واختبار صلاحيات قاعدة البيانات.
