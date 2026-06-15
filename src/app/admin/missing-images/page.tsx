import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import MissingImagesUI from "./MissingImagesUI";

export const metadata = { title: "Missing images — SH Admin" };
export const dynamic = "force-dynamic";

export default async function MissingImagesPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return (
    <div className="container-x py-6">
      <h1 className="font-display text-2xl text-brand-900 mb-2">Missing images</h1>
      <p className="text-sm text-brand-600 mb-6">
        Products and variants where the image URL points to a file that no longer exists on storage.
        Use the upload button on each row to replace the image.
      </p>
      <MissingImagesUI />
    </div>
  );
}
