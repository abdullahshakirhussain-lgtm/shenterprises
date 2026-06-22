import AIToolsClient from "./AIToolsClient";

export const dynamic = "force-dynamic";

export default function AIToolsPage() {
  return (
    <div className="container-x py-6">
      <h1 className="font-display text-2xl text-brand-900 mb-2">AI Tools</h1>
      <p className="text-brand-700 text-sm mb-6">
        Manage AI features — product embeddings, search index, project assistant settings.
      </p>
      <AIToolsClient />
    </div>
  );
}
