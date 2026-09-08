import Link from "next/link";
import { LegalPage, Section, Bullets, DefTable, Fill } from "@/components/legal/prose";

export const metadata = {
  title: "Terms of service",
  description:
    "The agreement between KlassHub and the schools that use it: accounts, fees, data ownership, availability and termination.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      updated={<Fill>effective date</Fill>}
      intro={
        <>
          These terms are the agreement between{" "}
          <Fill>registered company name and RC number</Fill> (&ldquo;we&rdquo;,
          &ldquo;KlassHub&rdquo;) and the school that opens an account
          (&ldquo;you&rdquo;). Registering a school means accepting them.
        </>
      }
    >
      <Section id="service" heading="What KlassHub provides">
        <p>
          A hosted portal for running a school: pupil records, results and
          report cards, attendance, assignments and tests, timetables,
          transport, fees and invoicing, and email and SMS notices to staff and
          guardians.
        </p>
        <p>
          Features change as the product develops. We will not remove something
          a school depends on without notice, but we do not promise that any
          particular feature will exist forever.
        </p>
      </Section>

      <Section id="accounts" heading="Accounts and who may use them">
        <Bullets
          items={[
            "Whoever registers a school confirms they are authorised to act for it and to enter information about its pupils.",
            "You are responsible for who you invite, and for the role you give them. An administrator can see the school's whole record.",
            "You are responsible for activity under your accounts. Keep passwords private and remove staff who leave.",
            "Accounts are for the school that opened them. Do not share one login between people — it makes an audit trail meaningless.",
          ]}
        />
      </Section>

      <Section id="your-data" heading="Your data stays yours">
        <p>
          Everything your school enters — pupils, marks, attendance, fees, files
          — belongs to your school. We claim no ownership of it and do not use
          it to train anything, sell it, or share it for advertising.
        </p>
        <p>
          We hold it to run the service for you, on your instructions. For data
          protection purposes your school is the controller and we are the
          processor; the{" "}
          <Link href="/privacy" className="font-semibold text-brand-600 hover:underline">
            privacy policy
          </Link>{" "}
          sets out what that means in practice.
        </p>
        <p>
          You are responsible for having the right to enter the information you
          enter — including obtaining guardians&apos; consent for children&apos;s
          data — and for its accuracy. A report card is only as correct as the
          marks typed into it.
        </p>
      </Section>

      <Section id="acceptable" heading="Acceptable use">
        <Bullets
          items={[
            "Do not use KlassHub to store information you have no right to hold, or for anything unlawful.",
            "Do not attempt to reach another school's data, probe the service for weaknesses without asking us first, or interfere with its operation.",
            "Do not resell access or present the service as your own product without a written agreement.",
            "Report a security problem to us rather than to the public. We will not pursue anyone who reports one in good faith and gives us reasonable time to fix it.",
          ]}
        />
      </Section>

      <Section id="fees" heading="Trial, fees and payment">
        <DefTable
          rows={[
            [
              "Free trial",
              "30 days from registration, with no card required.",
            ],
            [
              "Subscription",
              <>
                Charged per term at the plan prices shown on our pricing page.
                Prices may change with <Fill>decide: notice period</Fill> notice;
                a change never applies to a term already paid for.
              </>,
            ],
            [
              "Payment",
              "Taken through Paystack. We never see or store your card details.",
            ],
            [
              "Refunds",
              <Fill>
                decide and state plainly: e.g. no refunds mid-term, or pro-rata,
                or a cooling-off window
              </Fill>,
            ],
            [
              "Late payment",
              "When a term goes unpaid the account enters a short grace period, then locks.",
            ],
          ]}
        />
      </Section>

      <Section id="lockout" heading="What happens if you stop paying">
        <p>
          This is worth stating precisely, because it is where school software
          most often behaves badly. When an account locks:
        </p>
        <Bullets
          items={[
            "New records cannot be added and existing ones cannot be edited.",
            "Everything already in the account stays readable. You can still open every pupil record, every report card and every invoice.",
            "You can still delete your data, and still export it.",
          ]}
        />
        <p>
          We do not hold a school&apos;s register hostage over an unpaid
          invoice. A locked account is a read-only account, not a closed door.
        </p>
      </Section>

      <Section id="availability" heading="Availability">
        <p>
          We aim to keep KlassHub running during school hours and to schedule
          maintenance outside them. <Fill>Decide whether you are offering a
          specific uptime commitment. If you are not, say so here rather than
          leaving it vague — and if you are, state the figure and what happens
          when it is missed.</Fill>
        </p>
        <p>
          The service depends on providers listed in the privacy policy. An
          outage at one of them can take KlassHub down with it.
        </p>
      </Section>

      <Section id="liability" heading="Liability">
        <p>
          <Fill>
            This section must be drafted by a qualified lawyer. Limitation and
            exclusion clauses are the part of these terms most likely to be
            unenforceable if copied from elsewhere, and the part that matters
            most when something goes wrong. Do not launch with this placeholder
            in place.
          </Fill>
        </p>
        <p>
          Nothing in these terms is intended to exclude liability that cannot
          lawfully be excluded.
        </p>
      </Section>

      <Section id="ending" heading="Ending the agreement">
        <Bullets
          items={[
            "You may stop using KlassHub at any time. Cancelling stops future charges; it does not refund a term already paid for unless the refund terms above say otherwise.",
            "Export your data before you close an account. After closure it is deleted on the schedule in the privacy policy.",
            "We may suspend or close an account that breaks these terms, or that puts other schools' data at risk. Except where the problem is serious or unlawful, we will tell you and give you a chance to put it right first.",
          ]}
        />
      </Section>

      <Section id="law" heading="Governing law">
        <p>
          These terms are governed by the laws of the Federal Republic of
          Nigeria, and disputes are subject to the courts of{" "}
          <Fill>decide: state or judicial division</Fill>.
        </p>
      </Section>

      <Section id="changes" heading="Changes to these terms">
        <p>
          We may update these terms. If a change materially affects your rights
          or what you pay, we will tell schools before it takes effect. The date
          at the top always reflects the current version.
        </p>
        <p>
          Questions: <Fill>contact email</Fill>.
        </p>
      </Section>
    </LegalPage>
  );
}
