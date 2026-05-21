import EulerOverlapDiagram from "@/components/charts/EulerOverlapDiagram";
import type { EulerPairDetail } from "@/api/clustering";

interface EulerDetailModalProps {
  open: boolean;
  detail: EulerPairDetail | null;
  onClose: () => void;
}

export default function EulerDetailModal({
  open,
  detail,
  onClose,
}: EulerDetailModalProps) {
  if (!open || !detail) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-background p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Euler detail</h2>
            <p className="text-sm text-muted-foreground">
              Cluster overlap for the selected lineage edge
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Close
          </button>
        </div>

        <EulerOverlapDiagram detail={detail} />
      </div>
    </div>
  );
}