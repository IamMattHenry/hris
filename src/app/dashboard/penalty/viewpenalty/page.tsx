"use client";

import Link from "next/link";

export default function ViewPenaltyLandingPage() {
	return (
		<div className="p-8 text-[#3b2b1c]">
			<p className="mb-3">Select a penalty from the penalty list to view details.</p>
			<Link href="/dashboard/penalty" className="underline text-[#4b1f16]">
				Back to penalties
			</Link>
		</div>
	);
}
