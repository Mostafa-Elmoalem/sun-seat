# دليل استخدام الـ Prompt Pack | مشروع "اقعد فين؟" (اسم مبدئي)

## الفكرة في سطر
موقع mobile-first، المستخدم يكتب: رايح منين، لفين، إمتى، وبإيه (ميكروباص / أتوبيس)، والموقع يقوله يقعد فين عشان يهرب من الشمس، مع نسب ورسم للكراسي وعرض 3D اختياري.

## ترتيب الجلسات (كل ملف = session لوحدها في Gemini)

| # | الملف | الـ BMAD Role | المخرج |
|---|------|---------------|--------|
| 1 | 01-context-capsule.md | (ثابت) | تلصقه في أول كل session |
| 2 | 02-session-analyst-brief.md | Analyst | docs/project-brief.md |
| 3 | 03-session-pm-prd.md | PM | docs/prd.md |
| 4 | 04-session-ux-spec.md | UX Expert | docs/front-end-spec.md |
| 5 | 05-session-architect.md | Architect | docs/architecture.md |
| 6 | 06-session-po-validate-shard.md | PO + SM | validation report + docs/stories/* |
| 7 | 07-dev-sun-engine.md | Dev | محرك حساب الشمس + tests |
| 8 | 08-dev-geo-routing.md | Dev | المدن + المسارات + caching |
| 9 | 09-dev-exposure-seat-model.md | Dev | حساب التعرض لكل كرسي |
| 10 | 10-dev-ui-input-results.md | Dev | شاشة الإدخال والنتيجة |
| 11 | 11-dev-3d-view.md | Dev | العرض الـ 3D (lazy) |
| 12 | 12-dev-weather-pwa-offline.md | Dev | الطقس + PWA + offline |
| 13 | 13-qa-launch.md | QA | مراجعة نهائية + launch checklist |

## طريقة الشغل
1. الجلسات 2 لـ 6 (planning): في Gemini العادي أو Gem، لأن الـ context الكبير مفيد هنا.
2. الجلسات 7 لـ 13 (development): في Antigravity على الـ repo نفسه، عشان يقدر يشغل الـ tests والـ build بنفسه.
3. في أول كل session: الصق `01-context-capsule.md` وبعده الـ prompt بتاع الجلسة، وارفع ملفات الـ docs اللي الجلسة طالباها.
4. كل prompt فيه Self-Correction Loop، ومفيش جلسة بتقفل غير لما تكتب `APPROVE`.
5. آخر كل جلسة بيطلع "Handoff Capsule"، حدّث بيه قسم `DECISIONS LOG` في الـ context capsule قبل الجلسة اللي بعدها.

## قرارات أنا حطيتها كـ default (والـ Architect هيراجعها)
- **حساب الشمس على الموبايل نفسه**، من غير أي API. صفر إنترنت وصفر تكلفة.
- **المسارات بين المدن المصرية الرئيسية precomputed** كملفات JSON صغيرة على الـ CDN. السبب: لو الفيديو انتشر، أي API مجاني هيقع من الـ rate limit في ساعة. الـ live routing ييجي بعدين كـ fallback.
- **قايمة المدن والمواقف متخزنة جوه الموقع** (بالعامية والفصحى والإنجليزي)، فالـ autocomplete شغال offline.
- **الـ 3D lazy-loaded** ومش بيتحمل غير لو المستخدم ضغط عليه، لأن three.js لوحده تقيل على نت مصر.
- **الطقس اختياري ومش blocking**. لو ما وصلش، النتيجة تطلع برضه.
- **الـ vehicle profiles ملفات data** (ميكروباص، أتوبيس، وبعدين عربية ملاكي أو قطر) من غير ما نلمس المحرك.

## فخاخ لازم تاخد بالك منها
- **الـ RTL بيقلب الرسومات.** الواجهة عربي RTL، لكن رسمة الميكروباص لازم تفضل ثابتة (المقدمة لفوق، والشمال شمال فعلا). لو اتقلبت، النصيحة كلها هتطلع بالعكس.
- **التوقيت الصيفي في مصر.** كل الحسابات بـ `Africa/Cairo` مش offset ثابت.
- **سرعة الميكروباص مش سرعة الـ routing.** مدة الـ API محسوبة لعربية ملاكي، فمحتاجين speed factor وحساب حساسية (± نص ساعة في الوقت، ± 20% في السرعة) عشان نقول للمستخدم النصيحة مضمونة قد إيه.
- **الشمس الضهر في الصيف فوق الراس.** ساعتها السقف بيحمي والجنب مش فارق، والموقع لازم يقول كده بصراحة بدل ما يدي نصيحة وهمية.
- **شكل الكراسي في الميكروباص.** اتأكد من الـ layout الحقيقي بصورة من الموقف قبل جلسة 9.

## اسم المشروع
الـ prompts مكتوب فيها `[PROJECT_NAME]`. اقتراحات: "اقعد فين؟"، "الضل فين؟"، "شمس ولا ضل". غيّره مرة واحدة في الـ context capsule.
