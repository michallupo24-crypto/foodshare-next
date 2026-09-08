export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto bg-[var(--paper)] p-6 rounded-2xl border border-[var(--ink-border)] flex flex-col gap-5">
      <h2 className="text-3xl">תנאי שימוש</h2>
      <p className="text-sm text-[var(--ink)]/60">עדכון אחרון: ספטמבר 2026</p>

      <section className="flex flex-col gap-2">
        <h3 className="text-xl">מה זה FoodShare</h3>
        <p className="text-sm leading-relaxed">
          FoodShare היא פלטפורמה קהילתית המחברת בין אנשים שיש להם עודפי מזון לבין שכנים שמעוניינים בהם.
          השירות ניתן כפי שהוא (&quot;AS IS&quot;), ללא תשלום, ומטרתו לצמצם בזבוז מזון ולחזק קהילתיות.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xl">אחריות על המזון</h3>
        <p className="text-sm leading-relaxed">
          FoodShare היא רק שכבת תיווך בין משתמשים - אנחנו לא בודקים, לא מייצרים ולא אחראים על איכות,
          טריות או בטיחות המזון המוצע. כל העברה של מזון בין משתמשים נעשית על אחריותם הבלעדית של הצדדים.
          מומלץ להשתמש בשיקול דעת: לבדוק תאריכי תפוגה, תנאי אחסון, ולהימנע ממזון שנראה או מריח לא תקין.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xl">התנהלות במפגשי מסירה</h3>
        <p className="text-sm leading-relaxed">
          תיאום מקום וזמן איסוף הוא באחריות המשתמשים בלבד, דרך הצ&apos;אט שבאתר. מומלץ להיפגש במקום ציבורי
          ומואר, ולא לשתף פרטים אישיים מעבר למה שנדרש למסירה עצמה.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xl">חשבון ותוכן</h3>
        <p className="text-sm leading-relaxed">
          אתם אחראים לנכונות הפרטים שאתם מזינים (כולל תמונות, תיאורי מוצרים וביקורות) ולשמירה על סודיות
          פרטי ההתחברות שלכם. אסור לפרסם תוכן פוגעני, מטעה, או תמונות שאינן שייכות לכם. תמונה שדווחה
          מוסתרת אוטומטית עד לבדיקת מנהל/ת.
        </p>
        <p className="text-sm leading-relaxed">
          למנהלי האתר יש את הזכות לחסום כל משתמש/ת, לפי שיקול דעתם הבלעדי וללא צורך במתן נימוק - לרבות,
          אך לא רק, משתמשים שהפרו את כללי השימוש. חסימה היא תמיד החלטה יזומה ומנומקת של מנהל/ת אנושי/ת,
          ולעולם אינה מתבצעת אוטומטית.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xl">אימות משתמשים ודיווחים</h3>
        <p className="text-sm leading-relaxed">
          כדי לשמור על השירות נגיש, פשוט וחינמי לכולם, ל-FoodShare אין את היכולת ואין את האינטרס לאמת את
          זהות המשתמשים או לוודא שהפרטים שהם מזינים (שם, גיל, פרטי קשר וכיו&quot;ב) תקינים ומדויקים. השימוש
          באתר מבוסס על אמון הדדי בין חברי הקהילה, ואינו כולל בדיקת רקע או תעודה מזהה.
        </p>
        <p className="text-sm leading-relaxed">
          חרף זאת, אנחנו מעודדים בחום כל משתמש/ת לדווח על כל דבר שמפריע לו/ה - התנהגות, תוכן, תמונה או
          משתמש/ת אחר/ת - בין דרך כפתורי הדיווח באתר ובין בפנייה ישירה אלינו, ונעשה את מיטב מאמצנו לסייע
          ולטפל בכל פנייה.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xl">מיקום ופרטיות</h3>
        <p className="text-sm leading-relaxed">
          שיתוף מיקום (GPS) בהרשמה או בפרסום מוצר הוא תמיד וולונטרי, ומשמש אך ורק לחישוב מרחק משוער בין
          משתמשים - אין שימוש בשירותי מיפוי/גיאוקודינג חיצוניים, והמיקום המדויק שלכם אינו נחשף לאף
          משתמש אחר. ניתן להפסיק להשתמש בשירות בכל עת.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xl">שינויים בתנאים</h3>
        <p className="text-sm leading-relaxed">
          ייתכן ותנאים אלו יתעדכנו מעת לעת. המשך שימוש באתר לאחר עדכון מהווה הסכמה לתנאים המעודכנים.
        </p>
      </section>

      <p className="text-sm text-[var(--ink)]/60">
        שאלות? אפשר לפנות אלינו במייל: bagrutprojectfeedback@gmail.com
      </p>
    </div>
  );
}
