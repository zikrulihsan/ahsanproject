/**
 * What a person still has to do before this place works for them.
 *
 * The home page promises three surfaces built from the same evidence — the
 * project index, the portfolio, and the talent pool — and until now nothing
 * told a new account how to reach any of them. These are those steps, named.
 *
 * Deliberately a list of named things rather than a percentage. A profile is
 * not a form to fill to 100%; `docs/redesign-showcase.md` threw the brief's
 * completeness meter out for exactly that reason, and a bar would put it back
 * in a different corner of the site.
 *
 * No Next.js or Supabase imports: the inputs are structural, so `Person` and
 * `ProjectSummary` from `data.ts` satisfy them as they are, and
 * `tests/next-steps.test.mjs` can call this with plain objects.
 */

export type NextStepId = "project" | "talent" | "contact" | "now" | "role";

export type NextStep = {
  id: NextStepId;
  title: string;
  blurb: string;
  href: string;
  cta: string;
  done: boolean;
  /** A step worth offering but never counted as owed. */
  optional?: boolean;
};

/** The half of a profile these steps read. */
export type StepPerson = {
  profession: string;
  headline: string;
  bio: string;
  skills: string[];
  website: string;
  publicEmail: string;
  github: string;
  linkedin: string;
  x: string;
  resume: string;
};

/** The half of a project these steps read. */
export type StepProject = {
  slug: string;
  nowText: string;
  openSeatCount: number;
};

export function nextSteps({
  person,
  owned,
  contributing,
}: {
  person: StepPerson;
  owned: StepProject[];
  contributing: unknown[];
}): NextStep[] {
  const steps: NextStep[] = [
    {
      id: "project",
      title: "Show your first project",
      blurb:
        "An idea, a work in progress, or something people already use all count. This is where your portfolio and work trail begin.",
      href: "/new",
      cta: "Show a project",
      done: owned.length > 0 || contributing.length > 0,
    },
    {
      id: "talent",
      title: "Complete your talent-pool profile",
      blurb:
        "Your profession, skills, and a little about you. People use these details when searching /orang.",
      href: "/akun/profil",
      cta: "Complete profile",
      done: profileReady(person),
    },
    {
      id: "contact",
      title: "Add one way to contact you",
      blurb:
        "A public email, LinkedIn, GitHub, website, or résumé—one is enough. The email you use to sign in is never shown.",
      href: "/akun/profil#contact",
      cta: "Add a link",
      done: hasContact(person),
    },
  ];

  // The last two only make sense once there is a project to say it about.
  if (owned.length > 0) {
    const quiet = owned.find((project) => !project.nowText) ?? owned[0];
    steps.push({
      id: "now",
      title: "Describe what you are working on",
      blurb:
        "One sentence. This is what separates a living project from an abandoned idea list.",
      href: `/projects/${quiet.slug}`,
      cta: "Write the update",
      done: owned.some((project) => project.nowText !== ""),
    });

    const seatless = owned.find((project) => project.openSeatCount === 0) ?? owned[0];
    steps.push({
      id: "role",
      title: "Open a role when you need help",
      blurb: "Name the work and its estimated time commitment. This is optional—working alone does not make a project less valuable.",
      href: `/projects/${seatless.slug}?tab=kolaborasi`,
      cta: "Open a role",
      done: owned.some((project) => project.openSeatCount > 0),
      optional: true,
    });
  }

  return steps;
}

/** The steps still owed. Optional ones never appear here. */
export function remainingSteps(steps: NextStep[]): NextStep[] {
  return steps.filter((step) => !step.done && !step.optional);
}

/** Enough on a profile for the people directory to have something to match. */
export function profileReady(person: StepPerson): boolean {
  return (
    person.profession.trim() !== "" &&
    person.skills.length > 0 &&
    (person.bio.trim() !== "" || person.headline.trim() !== "")
  );
}

/** Whether anybody reading the profile could reach its owner. */
export function hasContact(person: StepPerson): boolean {
  return [
    person.website,
    person.publicEmail,
    person.github,
    person.linkedin,
    person.x,
    person.resume,
  ].some((value) => value.trim() !== "");
}
