export default function TermsPage() {
  return (
    <div className="page page-mid flex flex-col gap-7">
      <div className="page-head">
        <div className="eyebrow">עדכון אחרון: ספטמבר 2026</div>
        <h1 className="display text-[72px]">תנאי שימוש</h1>
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="display-sm">מה זה FoodShare</h3>
        <p className="m-0 text-base leading-[1.7] [text-wrap:pretty]">
          FoodShare היא פלטפורמה קהילתית המחברת בין אנשים שיש להם עודפי מזון לבין שכנים שמעוניינים בהם.
          השירות ניתן כפי שהוא (&quot;AS IS&quot;), ללא תשלום, ומטרתו לצמצם בזבוז מזון ולחזק קהילתיות.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="display-sm">אחריות על המזון</h3>
        <p className="m-0 text-base leading-[1.7] [text-wrap:pretty]">
          FoodShare היא רק שכבת תיווך בין משתמשים - אנחנו לא בודקים, לא מייצרים ולא אחראים על איכות,
          טריות או בטיחות המזון המוצע. כל העברה של מזון בין משתמשים נעשית על אחריותם הבלעדית של הצדדים.
          מומלץ להשתמש בשיקול דעת: לבדוק תאריכי תפוגה, תנאי אחסון, ולהימנע ממזון שנראה או מריח לא תקין.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="display-sm">התנהלות במפגשי מסירה</h3>
        <p className="m-0 text-base leading-[1.7] [text-wrap:pretty]">
          תיאום מקום וזמן איסוף הוא באחריות המשתמשים בלבד, דרך הצ&apos;אט שבאתר. מומלץ להיפגש במקום ציבורי
          ומואר, ולא לשתף פרטים אישיים מעבר למה שנדרש למסירה עצמה.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="display-sm">חשבון ותוכן</h3>
        <p className="m-0 text-base leading-[1.7] [text-wrap:pretty]">
          אתם אחראים לנכונות הפרטים שאתם מזינים (כולל תמונות, תיאורי מוצרים וביקורות) ולשמירה על סודיות
          פרטי ההתחברות שלכם. אסור לפרסם תוכן פוגעני, מטעה, או תמונות שאינן שייכות לכם. תמונה שדווחה
          מוסתרת אוטומטית עד לבדיקת מנהל/ת.
        </p>
        <p className="m-0 text-base leading-[1.7] [text-wrap:pretty]">
          למנהלי האתר יש את הזכות לחסום כל משתמש/ת, לפי שיקול דעתם הבלעדי וללא צורך במתן נימוק - לרבות,
          אך לא רק, משתמשים שהפרו את כללי השימוש. חסימה היא תמיד החלטה יזומה ומנומקת של מנהל/ת אנושי/ת,
          ולעולם אינה מתבצעת אוטומטית.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="display-sm">אימות משתמשים ודיווחים</h3>
        <p className="m-0 text-base leading-[1.7] [text-wrap:pretty]">
          כדי לשמור על השירות נגיש, פשוט וחינמי לכולם, ל-FoodShare אין את היכולת ואין את האינטרס לאמת את
          זהות המשתמשים או לוודא שהפרטים שהם מזינים (שם, גיל, פרטי קשר וכיו&quot;ב) תקינים ומדויקים. השימוש
          באתר מבוסס על אמון הדדי בין חברי הקהילה, ואינו כולל בדיקת רקע או תעודה מזהה.
        </p>
        <p className="m-0 text-base leading-[1.7] [text-wrap:pretty]">
          חרף זאת, אנחנו מעודדים בחום כל משתמש/ת לדווח על כל דבר שמפריע לו/ה - התנהגות, תוכן, תמונה או
          משתמש/ת אחר/ת - בין דרך כפתורי הדיווח באתר ובין בפנייה ישירה אלינו, ונעשה את מיטב מאמצנו לסייע
          ולטפל בכל פנייה.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="display-sm">מיקום ופרטיות</h3>
        <p className="m-0 text-base leading-[1.7] [text-wrap:pretty]">
          שיתוף מיקום (GPS) בהרשמה או בפרסום מוצר הוא תמיד וולונטרי, ומשמש אך ורק לחישוב מרחק משוער בין
          משתמשים - אין שימוש בשירותי מיפוי/גיאוקודינג חיצוניים, והמיקום המדויק שלכם אינו נחשף לאף
          משתמש אחר. ניתן להפסיק להשתמש בשירות בכל עת.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="display-sm">שינויים בתנאים</h3>
        <p className="m-0 text-base leading-[1.7] [text-wrap:pretty]">
          ייתכן ותנאים אלו יתעדכנו מעת לעת. המשך שימוש באתר לאחר עדכון מהווה הסכמה לתנאים המעודכנים.
        </p>
      </section>

      <p className="m-0 pt-5 border-t-[1.6px] border-ink text-[15px] text-ink/65">
        שאלות? אפשר לפנות אלינו במייל:{" "}
        <a href="mailto:bagrutprojectfeedback@gmail.com">bagrutprojectfeedback@gmail.com</a>
      </p>
    </div>
  );
}
