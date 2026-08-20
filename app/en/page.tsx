import { redirect } from "next/navigation";

/** `/en` used to be the English homepage; the story now lives at `/en/about`. */
export default function EnglishIndex() {
  redirect("/en/about");
}
