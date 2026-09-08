# التشغيل والإطلاق

هذا المستند يصف أوامر التشغيل التي يمكن تنفيذها في هذا المستودع. لا توجد بيئة إنتاج أو نطاق معلن هنا، لذلك لا ينفذ CI أي نشر ولا يدّعي نجاح نشر.

## الفحوص المحلية

```sh
npm ci
npm run lint
npm run typecheck
python3 scripts/check_content.py
python3 scripts/test_content_pipeline.py
python3 scripts/check_assets.py
npm run test:backend
npm audit --omit=dev --audit-level=high
npm run build
```

يتطلب `check_assets.py` FFmpeg لفحص الملفات الصوتية. لتفعيل حسابات الأسرة اضبط `NEXT_PUBLIC_CONVEX_URL`؛ عند غيابه يعرض التطبيق صفحة الإعداد. لا تضع سرًا في متغير عام. أمر `build_content.py` بوابة محتوى مستقلة ولا ينجح حتى تكون كل المواد معتمدة وأصولها مرخصة:

```sh
python3 scripts/build_content.py --output /tmp/teaching-children-islam-catalog.json
```

## إعداد Convex وAuth

قرار صاحب المشروع الحالي: حسابات بريد وكلمة مرور دون خدمة بريد. يقبل Convex Auth عنوان بريد صحيح الصيغة دون إرسال تحقق، ولا تتاح استعادة كلمة المرور بالبريد. يستعيد الوالد PIN بكلمة مرور الحساب الحالية. لا تضع أسرار Auth في العميل.

المشروع المهيأ للتطوير هو `teaching-children-islam`. شغّل `npx convex dev --once` لاستخدام إعداد `.env.local` القائم؛ لا تستخدم `--configure` إلا لتغيير المشروع. `NEXT_PUBLIC_CONVEX_URL` عنوان عام للواجهة، و`CONVEX_DEPLOYMENT` يحدد بيئة التطوير. إعداد Auth يتطلب مفاتيح `JWT_PRIVATE_KEY` و`JWKS` داخل Convex مع `SITE_URL` المناسب؛ شغّل `npx @convex-dev/auth` لإعداد مفاتيح المصادقة عبر CLI الرسمي، ولا تطبعها في السجلات.

خدمة البريد مؤجلة بطلب صاحب المشروع. عند طلب تفعيلها لاحقًا، أضف مزود التحقق والاستعادة إلى Password واختبر الرحلتين قبل إعلان توفرهما.

## النسخ الاحتياطي والاستعادة

النسخ الاحتياطي اليدوي من Dashboard يشمل البيانات، ويمكن تضمين File Storage. CLI الحالي يدعم تصدير ZIP:

```sh
npx convex export --prod --include-file-storage --path /secure/backups/snapshot.zip
```

تحقق من وجود الملف وحجمه وتخزينه خارج المستودع مع صلاحيات مقيدة. لا تعرض محتواه في logs. للاستعادة التجريبية، اختر deployment مؤقتًا أو preview فارغًا ثم نفّذ:

```sh
npx convex import --preview-name restore-drill /secure/backups/snapshot.zip
```

الاستعادة إلى deployment قائم مدمرة للبيانات الموجودة؛ خذ نسخة إضافية أولًا، ثم استخدم `--prod --replace` فقط بعد مراجعة snapshot وdeployment يدويًا:

```sh
npx convex export --prod --include-file-storage --path /secure/backups/pre-restore.zip
npx convex import --prod --replace /secure/backups/snapshot.zip
```

قائمة تحقق تمرين الاستعادة:

1. سجّل معرف ووقت snapshot دون نشر محتواه.
2. استورد إلى preview أو deployment مؤقت.
3. افحص عدد الجداول والملفات، وأنشئ حساب اختبار وطفلين وتحقق من عزل البيانات.
4. شغّل `npx convex run` لاستعلامات القراءة المناسبة، ثم افحص تسجيلًا اختباريًا وملفه.
5. وثّق النتيجة والمدة وأي فقد، واحذف preview بعد انتهاء التمرين.

هذه الأوامر مبنية على [Convex export](https://docs.convex.dev/cli/reference/export) و[Convex import](https://docs.convex.dev/cli/reference/import) و[دليل النسخ والاستعادة](https://docs.convex.dev/database/backup-restore). لم يُنفذ تصدير أو استيراد من هذه الوثيقة.

## التراجع

التراجع البرمجي هو إعادة نشر commit معروف، بعد تحديد deployment يدويًا وأخذ backup:

```sh
git show --stat <known-good-commit>
git switch --detach <known-good-commit>
npm ci
npm run lint && npm run typecheck && npm run build
npx convex deploy
```

لا تعكس استعادة البيانات تلقائيًا؛ استخدم تمرين الاستعادة أعلاه إذا كان العطل في البيانات. بعد الفحص، ارجع إلى الفرع المعتاد أو أنشئ commit إصلاح جديد. لا يوجد أمر deploy في CI الحالي لأن اسم وموافقة deployment الإنتاج غير محددين.

## بوابة إصدار المحتوى

لا يُنشر المحتوى التجريبي. قبل أي إصدار كامل يجب أن ينجح `check_content.py` و`check_assets.py` و`build_content.py`، وأن تكون حالات السجلات والأصول `approved` و`publishable: true` مع حقوق موثقة. فشل `build_content.py` الحالي متوقع؛ لا توجد موافقة مختص، مقابلة بصرية كاملة، تلاوات مرخصة، أو أصوات ورسوم نهائية لكل الدروس.

تبقى أدلة خارجية مطلوبة: اعتماد المحتوى والآيات والأحاديث والتشكيل، وثائق الحقوق، اختبار أجهزة Safari iOS وChrome Android، وتجارب أطفال من الفئتين بموافقة أوليائهم. هذه لا يمكن لـ CI اختلاقها.

## مراقبة التشغيل

استخدم لوحة Convex لمراقبة أخطاء الدوال والأزمنة، ولوحة المتابعة داخل التطبيق لمؤشرات التعلّم. اضبط `AUTH_LOG_LEVEL` على `ERROR` في Convex؛ لا تستخدم وضع DEBUG مع بيانات الأسر. لا تضف التسجيلات أو إجابات الأطفال أو كلمات المرور أو رموز الجلسات إلى السجلات. عند فشل رفع التسجيل يبقى الملف المحلي لإعادة المحاولة، وينظف الخادم الملف الجديد إذا رفض اعتماده.

## تحديث المحتوى

حرّر ملفات `content/*.json` وأبقِ المسودات غير قابلة للنشر. وثّق مراجعة المختص والمقابلة البصرية في حقول الاعتماد، ثم اربط النصوص والأصوات والصور التي توثقت حقوقها. اتبع `content/catalog-format.md` و`content/implementation-review.md`. شغّل `npm run build:release` قبل أي إطلاق كامل؛ أمر البناء العادي مخصص أيضًا لبيئات التطوير ذات المحتوى غير المكتمل ولا يمنحها صفة الإصدار الكامل.

## PWA and search metadata

The canonical production origin is `https://littlemuslim.assoli.site/`. Set `SITE_URL` to override it when moving domains. Public routes appear in `/sitemap.xml`; family and QA pages carry `noindex` metadata.

The production-only service worker requires HTTPS (localhost also works). It caches only `/offline.html` and the logo, never accounts, lessons, API responses or recordings. Learning and progress saving require a connection. Updated workers activate after existing app windows close, avoiding interruptions to recordings. Bump `CACHE` in `public/sw.js` whenever the fallback or logo changes.

Install using the browser's app installation menu, or Safari's Share → Add to Home Screen. To verify offline behavior, visit once online, wait for service-worker activation, switch the browser offline and reload. Expect the Arabic fallback with a retry link.

Brand assets share `public/icon.svg`. Run `node scripts/build_branding.mjs` to regenerate PNG icons, the maskable icon, favicon, Open Graph and Twitter cards using the installed Sharp dependency. Review Arabic text rendering after regeneration.
