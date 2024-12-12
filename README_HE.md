<div align="rtl">

# אלייזה 🤖

<div align="center">
  <img src="./docs/static/img/eliza_banner.jpg" alt="אלייזה באנר" width="100%" />
</div>

<div align="center">

📖 [תיעוד](https://ai16z.github.io/eliza/) | 🎯 [דוגמאות](https://github.com/thejoven/awesome-eliza)
</div>


<div align="center">

[中文说明](./README_CN.md) | [日本語の説明](./README_JA.md) | [한국어 설명](./README_KOR.md) | [Français](./README_FR.md) | [Português](./README_PTBR.md) | [Türkçe](./README_TR.md) | [Русский](./README_RU.md) | [Español](./README_ES.md) | [Italiano](./README_IT.md) | [ไทย](./README_TH.md) | [Deutsch](./README_DE.md) | [עִברִית](./README_HE.md)

</div>

## ✨ תכונות

<div align="right">
-   🛠️ מחברים מלאים לדיסקורד, טוויטר וטלגרם
</div>
<div align="right">
-   🔗 תמיכה בכל מודל (Llama, Grok, OpenAI, Anthropic, וכו')
</div>
<div align="right">
-   👥 תמיכה בריבוי סוכנים וחדרים
</div>
<div align="right">
-   📚 קל לשלב ולהשתמש במסמכים שלך
</div>
<div align="right">
-   💾 זיכרון ומאגר מסמכים הניתנים לשליפה
</div>
<div align="right">
-   🚀 ניתן להרחבה רבה - יצירת פעולות ולקוחות משלך
</div>
<div align="right">
-   ☁️ תומך בהרבה מודלים (local Llama, OpenAI, Anthropic, Groq ,
וכו')
</div>
<div align="right">
-   📦 פשוט עובד!
</div>

## 🎯 מקרי שימוש

<div align="right">
-   🤖 צ'טבוטים
</div>
<div align="right">
-   🕵️ סוכנים אוטונומיים
</div>
<div align="right">
-   📈 טיפול בתהליכים עסקיים
</div>
<div align="right">
-   🎮 במשחקי וידאו (NPCs)
</div>
<div align="right">
-   🧠 מסחר
</div>

## 🚀 התחלה מהירה

<div align="right">

### דרישות מוקדמות

[Python 2.7+](https://www.python.org/downloads/) -

[Node.js 23+](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) -

[pnpm](https://pnpm.io/installation) -

> **הערה למשתמשי Windows:** נדרש [WSL 2](https://learn.microsoft.com/en-us/windows/wsl/install-manual)


### שימוש ב-Starter (מומלץ)

<div align="rtl">

```bash
git clone https://github.com/ai16z/eliza-starter.git

cp .env.example .env

pnpm i && pnpm start
```
</div>

<div align="right">
לאחר מכן קרא את [התיעוד](https://ai16z.github.io/eliza/) כדי ללמוד כיצד להתאים את אלייזה.
</div>

### התחלה ידנית של אלייזה (מומלץ רק למי שיודע מה הוא עושה)
<div align="right">

```
# שכפול המאגר
git clone https://github.com/ai16z/eliza.git

# מעבר לגרסה האחרונה
git checkout $(git describe --tags --abbrev=0)
```
</div>

### התחלת אלייזה עם Gitpod

[![פתח ב-Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/ai16z/eliza/tree/main)

### עריכת קובץ .env

העתק את .env.example ל-.env ומלא את הערכים המתאימים.

```
cp .env.example .env
```

הערה: .env הוא אופציונלי. אם אתם מתכננים להפעיל מספר סוכנים נפרדים, ניתן להעביר סודות דרך JSON הדמות.

### התחלה אוטומטית של אלייזה

פעולה זו תפעיל הכל כדי להגדיר את הפרויקט ולהתחיל את הבוט עם הדמות המובנית.

```bash
sh scripts/start.sh
```

### עריכת קובץ הדמות

<!-- <div align="right"> -->
1. פתח את `agent/src/character.ts` כדי לשנות את דמות ברירת המחדל. בטל הערה וערוך.
<!-- </div> -->
<!-- <div align="right"> -->
2. לטעינת דמויות מותאמות אישית:
    - השתמש ב-`pnpm start --characters="path/to/your/character.json"`
    - ניתן לטעון מספר קבצי דמויות בו זמנית.
<!-- </div> -->
<!-- <div align="right"> -->
3. התחבר עם X (טוויטר):
    - שנה `"clients": []` ל-`"clients": ["twitter"]` בקובץ הדמות כדי להתחבר ל-X.
<!-- </div> -->

### התחלה ידנית של אלייזה
<div align="right">

```bash
pnpm i
pnpm build
pnpm start

# לעיתים צריך לנקות את הפרויקט אם חוזרים אליו לאחר זמן
pnpm clean
```
</div>

#### דרישות נוספות

ייתכן שתצטרך להתקין את Sharp. אם אתה רואה שגיאה בעת ההפעלה, נסה להתקין עם הפקודה הבאה:

```
pnpm install --include=optional sharp
```

### קהילה ויצירת קשר

<div align="right">

[GitHub Issues](https://github.com/ai16z/eliza/issues) מתאים ביותר עבור: באגים ופרופוזיציות לתכונות -

[Discord](https://discord.gg/ai16z) מתאים ביותר עבור: שיתוף היישומים שלך והשתתפות בקהילה -
</div>

## תורמים

<!-- <div align="right"> -->

<a href="https://github.com/ai16z/eliza/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=ai16z/eliza" />
</a>

<!-- </div> -->

## היסטוריית כוכבים

[![תרשים היסטוריית כוכבים](https://api.star-history.com/svg?repos=ai16z/eliza&type=Date)](https://star-history.com/#ai16z/eliza&Date)

</div>
