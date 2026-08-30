import ShiftQrDisplay from "@/components/ShiftQrDisplay";

export default function HostShiftPage({ params }: { params: { id: string; shiftId: string } }) {
  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <ShiftQrDisplay shiftId={params.shiftId} />
    </div>
  );
}
