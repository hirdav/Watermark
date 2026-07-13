const USE_CASES = [
  {
    title: "Photography Client Proofing",
    problem:
      "A photographer typically captures photos and shares them with clients using Google Drive. When the gallery is very large, often 30 to 40 GB, it becomes difficult for clients to review everything online. As a result, many photographers ask clients to visit their studio, or a team member visits the client's location, to go through the images together and decide which ones should be included in the final delivery.",
    friction: "This process is time consuming and inefficient.",
    solution:
      "Proof simplifies the entire workflow. The photographer uploads or imports the photos, applies a watermark to prevent premature use of their work, and shares the gallery with the client. The client can review the images from anywhere, mark their favorite photos, and leave comments where needed. The photographer receives the client's selections instantly, making the final image selection process much faster while eliminating the need for in-person review sessions.",
  },
  {
    title: "UI/UX Design Reviews",
    problem:
      "A UI/UX designer often shares multiple design iterations with clients through Google Drive, Figma exports, or ZIP files. Clients usually provide feedback through emails, chat messages, or phone calls, making it difficult to keep comments organized. Designers also spend time asking which version the client prefers and manually compiling feedback from different sources.",
    friction: "This back-and-forth slows down approvals and increases the chance of miscommunication.",
    solution:
      "With Proof, the designer uploads screens or design exports into a gallery and shares a single review link. Clients can mark their preferred designs, leave comments directly on specific screens, and provide feedback in one place. The designer receives structured feedback and clear favorites, making revisions and approvals significantly faster.",
  },
  {
    title: "Social Media & Thumbnail Creators",
    problem:
      "A thumbnail or social media designer typically creates several variations for a YouTube creator or brand. These versions are often shared through messaging apps or cloud storage, where clients reply with screenshots, vague descriptions, or messages like “I like the third one.”",
    friction: "Tracking which design the client actually selected becomes confusing, especially when multiple revisions are involved.",
    solution:
      "With Proof, every thumbnail or creative variation is presented in a dedicated gallery. Clients simply mark their favorite options and leave comments where needed. The creator immediately knows which design has been approved, reducing unnecessary revisions and speeding up content publishing.",
  },
  {
    title: "Freelancers & Creative Agencies",
    problem:
      "Freelancers and creative agencies regularly deliver logos, illustrations, branding assets, marketing creatives, or other visual work to clients. Feedback often arrives across WhatsApp, email, Slack, or phone calls, making it difficult to manage revisions and maintain a clear approval process.",
    friction: "This scattered workflow leads to delays, repeated questions, and unnecessary meetings.",
    solution:
      "Proof provides a single destination for sharing visual work. Clients can review every asset online, mark favorites, and leave organized feedback directly within the gallery. The freelancer or agency receives all approvals and comments in one place, making collaboration smoother, reducing revision cycles, and helping projects move to completion faster.",
  },
];

export function UseCases() {
  return (
    <section id="use-cases" className="scroll-mt-20 bg-zinc-50 py-20 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-500">Use cases</h2>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            Built for anyone who shares work before it&apos;s approved
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {USE_CASES.map((uc) => (
            <div
              key={uc.title}
              className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-7 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{uc.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{uc.problem}</p>
              <p className="mt-3 text-sm font-medium italic leading-relaxed text-zinc-500 dark:text-zinc-500">
                {uc.friction}
              </p>
              <div className="mt-4 flex items-start gap-2.5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-green-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{uc.solution}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
