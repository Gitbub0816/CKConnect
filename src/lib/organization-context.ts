import "server-only";

import { cache } from "react";
import { getDb } from "@/lib/db";

export const getOrganizationContext = cache((slug: string) =>
  getDb().organization.findUnique({
    where: { slug },
    include: {
      integrations: {
        where: { provider: "SLACK" },
        take: 1,
      },
      moduleConfiguration: true,
      theme: true,
    },
  }),
);
