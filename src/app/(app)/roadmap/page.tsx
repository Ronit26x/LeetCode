import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { RoadmapView } from "@/components/roadmap/roadmap-view";
import { getSettings } from "@/db/bootstrap";
import { reviewDayKey } from "@/lib/day";
import { PATTERN_CODES, ROADMAP_PROBLEMS } from "@/lib/roadmap/data";
import { getRoadmapMarks } from "@/lib/roadmap/queries";

export const metadata: Metadata = { title: "Roadmap" };

export default async function RoadmapPage() {
  const [marks, settings] = await Promise.all([getRoadmapMarks(), getSettings()]);
  // "Today" is the review day (dayStartHour in the user's zone), the same boundary the reviser uses,
  // so a late session after midnight still belongs to the day it started.
  const today = reviewDayKey(new Date(), settings.timezone, settings.dayStartHour);
  return (
    <>
      <PageHeader
        title="Roadmap"
        description={`${ROADMAP_PROBLEMS.length} Google-tagged problems in ${PATTERN_CODES.length} patterns, mapped to the four weeks before the interview. Marks here never touch the review schedule.`}
      />
      <RoadmapView initialMarks={marks} today={today} />
    </>
  );
}
