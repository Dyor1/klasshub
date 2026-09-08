import Link from "next/link";
import { LegalPage, Section, Bullets, DefTable, Fill } from "@/components/legal/prose";

export const metadata = {
  title: "Privacy policy",
  description:
    "What KlassHub collects, who can see it, where it is stored, and how to exercise your rights under the Nigeria Data Protection Act.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated={<Fill>effective date</Fill>}
      intro={
        <>
          KlassHub is school software. Most of what it holds is information
          about children, entered by their school. This page says plainly what
          is collected, who can see it, where it is kept and how to have it
          corrected or removed.
        </>
      }
    >
      <Section id="who" heading="Who this is about">
        <p>
          KlassHub is operated by <Fill>registered company name and RC number</Fill>,
          of <Fill>registered address</Fill>. You can reach us at{" "}
          <Fill>privacy contact email</Fill>.
        </p>
        <p>
          There are two different relationships here, and the difference decides
          who you should ask about what:
        </p>
        <DefTable
          rows={[
            [
              "Your school is the data controller",
              "for everything about its pupils, guardians and staff — names, marks, attendance, fees. The school decides what to enter and how long to keep it. We only hold and process it on the school's instructions.",
            ],
            [
              "We are the data controller",
              "for the account of whoever signs a school up: their name, email and password, and our billing records with them. That relationship is directly with us.",
            ],
          ]}
        />
        <p>
          So if you are a parent asking about your child&apos;s record, ask the
          school first — they control it and can change it immediately. If they
          need our help, we will help them.
        </p>
      </Section>

      <Section id="collect" heading="What is collected">
        <p>
          This list is drawn from what the software actually stores, not from a
          template. If a field is not here, it is not collected.
        </p>
        <DefTable
          rows={[
            [
              "Staff and user accounts",
              "Name, email address, role, and a phone number where one is given (used only for SMS notices). Passwords are stored as a hash by our authentication provider — nobody at KlassHub can read them.",
            ],
            [
              "Pupils",
              "Name, admission number, class, gender, date of birth, address, and a photograph where the school uploads one.",
            ],
            [
              "Guardians",
              "Name, phone number and email address, so the school can reach the people responsible for a child.",
            ],
            [
              "Academic records",
              "Marks, grades, positions, report cards, attendance, assignment submissions, computer-based test answers, and teaching notes.",
            ],
            [
              "Fees",
              "Invoices, balances, payment records and payment references.",
            ],
            [
              "Transport",
              "Route names and, where a school records them, driver names and phone numbers.",
            ],
            [
              "Message delivery records",
              "Whether an email or SMS was sent, when, and whether it succeeded.",
            ],
          ]}
        />
        <p>
          <strong className="font-semibold text-ink">
            Card details are never collected.
          </strong>{" "}
          Payments go directly to Paystack, who handle the card. No card number
          reaches KlassHub, and none is stored here.
        </p>
      </Section>

      <Section id="why" heading="Why it is held">
        <Bullets
          items={[
            "To run the school: registers, marks, report cards, invoices, timetables.",
            "To let a school reach parents and staff by email or SMS about their own children and work.",
            "To take fee and subscription payments.",
            "To keep accounts secure and to investigate misuse.",
            <>
              Under the Nigeria Data Protection Act 2023 the lawful bases we
              rely on are <Fill>confirm with your adviser: contract, legitimate
              interest, legal obligation, consent</Fill>. Where consent is the
              basis — most obviously for a child&apos;s data — it is the school
              that obtains it from guardians.
            </>,
          ]}
        />
      </Section>

      <Section id="children" heading="Children's information">
        <p>
          Most records here belong to children, which is why access is narrow by
          design rather than by policy alone:
        </p>
        <Bullets
          items={[
            "A pupil sees only their own record, and only marks the school has chosen to publish.",
            "A parent sees only children explicitly linked to them. A parent with no link sees nothing at all.",
            "No school can see another school's pupils. That separation is enforced by the database itself, not by application code that could be bypassed.",
            "Administrators can confirm that a message was delivered, but cannot read its contents or the recipient's phone number.",
          ]}
        />
        <p>
          Schools are responsible for obtaining guardian consent before entering
          a child&apos;s information, and for making sure the people they invite
          as staff are entitled to see it.
        </p>
      </Section>

      <Section id="sharing" heading="Who else is involved">
        <p>
          KlassHub does not sell data and does not share it for advertising. To
          run the service we use these providers, and nothing else:
        </p>
        <DefTable
          rows={[
            ["Supabase", "Database, sign-in and file storage. Hosted in Ireland (eu-west-1)."],
            ["Vercel", "Runs the application itself. Served from Dublin (dub1)."],
            ["Brevo", "Sends email notifications."],
            ["Termii", "Sends SMS notifications."],
            ["Paystack", "Processes card payments. Regulated by the Central Bank of Nigeria."],
          ]}
        />
        <p>
          Because our database and application are hosted in Ireland, data is
          transferred outside Nigeria. <Fill>Confirm the transfer safeguard you
          rely on under sections 41–43 of the NDPA, and state it here</Fill>.
        </p>
        <p>
          We may also disclose information where the law requires it, or to
          establish or defend a legal claim.
        </p>
      </Section>

      <Section id="cookies" heading="Cookies">
        <p>
          KlassHub sets cookies for one purpose: keeping you signed in. There
          are no advertising cookies, no analytics trackers, no pixels and no
          third-party scripts collecting anything about your visit. That is why
          there is no cookie banner — there is nothing to consent to beyond the
          sign-in itself, which you can end at any time by signing out.
        </p>
      </Section>

      <Section id="security" heading="How it is protected">
        <Bullets
          items={[
            "Every record carries the school it belongs to, and the database refuses to return another school's rows regardless of what the application asks for.",
            "Traffic is encrypted in transit. Files are held in a private store and reached only through short-lived links.",
            "Passwords are hashed by our authentication provider and cannot be read by us.",
            "Message contents and recipients' phone numbers are withheld from every role, including school administrators.",
            "Payment confirmations are accepted only from Paystack over a signed webhook, so a payment cannot be faked by visiting a URL.",
          ]}
        />
        <p>
          No system is perfectly secure. If we discover a breach affecting
          personal data we will notify the affected schools and the Nigeria Data
          Protection Commission as required, within <Fill>confirm notification
          window</Fill>.
        </p>
      </Section>

      <Section id="retention" heading="How long it is kept">
        <p>
          A school&apos;s records are kept for as long as the school uses
          KlassHub. After an account closes:
        </p>
        <Bullets
          items={[
            <>
              School and pupil data is deleted after{" "}
              <Fill>decide: e.g. 30, 60 or 90 days</Fill>, giving the school time
              to export it.
            </>,
            <>
              Billing and payment records are kept for{" "}
              <Fill>decide — check the retention your tax obligations require</Fill>.
            </>,
            <>
              Backups roll off after <Fill>decide: backup retention window</Fill>.
            </>,
          ]}
        />
        <p>
          A school can delete pupil records at any time while its account is
          open, including when its subscription has lapsed.
        </p>
      </Section>

      <Section id="rights" heading="Your rights">
        <p>
          Under the Nigeria Data Protection Act 2023 you may ask to see the
          information held about you, to have it corrected, to have it deleted,
          to object to how it is used, or to receive a copy in a portable form.
        </p>
        <p>
          For a pupil or guardian record, ask the school — they hold it and can
          act immediately. For anything else, or if a school cannot help, write
          to <Fill>privacy contact email</Fill> and we will respond within{" "}
          <Fill>decide: e.g. 30 days</Fill>.
        </p>
        <p>
          If you are not satisfied, you can complain to the Nigeria Data
          Protection Commission.
        </p>
      </Section>

      <Section id="changes" heading="Changes">
        <p>
          If this policy changes in a way that materially affects how
          information is handled, schools using KlassHub will be told before it
          takes effect. The date at the top always reflects the current version.
        </p>
        <p>
          Questions about this policy: <Fill>privacy contact email</Fill>. Our
          terms of service are{" "}
          <Link href="/terms" className="font-semibold text-brand-600 hover:underline">
            here
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
