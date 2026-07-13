"use client";

import { useState } from "react";
import { UpgradeButton } from "./UpgradeButton";
import { WaitlistModal } from "@/components/ui/WaitlistModal";

/**
 * Wraps UpgradeButton for the /pricing page. When `gated` (the signed-in user is
 * on the Free plan), the click opens the waitlist modal instead of Razorpay
 * checkout — the checkout flow itself is untouched and still used for anyone
 * already on a paid plan.
 */
export function TierAction({ plan, label, gated }: { plan: "PRO" | "STUDIO"; label: string; gated: boolean }) {
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  return (
    <>
      <UpgradeButton
        plan={plan}
        label={label}
        onIntercept={
          gated
            ? () => {
                setWaitlistOpen(true);
                return true;
              }
            : undefined
        }
      />
      <WaitlistModal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} plan={plan} planLabel={label} />
    </>
  );
}
