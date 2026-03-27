"use client";

import { useRouter } from "next/navigation";
import AddPenaltyModal from "@/components/modals/AddPenaltyModal";

export default function AddPenaltyRoutePage() {
  const router = useRouter();

  return (
    <AddPenaltyModal
      isOpen={true}
      onClose={() => router.push("/dashboard/penalty")}
      onSaved={() => router.push("/dashboard/penalty")}
    />
  );
}
