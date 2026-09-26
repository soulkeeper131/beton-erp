"use client";

import { useParams } from "next/navigation";
import { WorkerForm } from "@/components/worker-form";

export default function EditWorkerPage() {
  const params = useParams();
  return <WorkerForm workerId={params.id as string} />;
}
