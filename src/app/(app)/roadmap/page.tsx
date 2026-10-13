import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { RoadmapView } from "@/components/roadmap/roadmap-view";
import { getSettings } from "@/db/bootstrap";
import { calendarDayKey } from "@/lib/day";
import { PATTERN_CODES, ROADMAP_PROBLEMS } from "@/lib/roadmap/data";
import { getRoadmapMarks } from "@/lib/roadmap/queries";

export const metadata: Metadata = { title: "Roadmap" };

export default async function RoadmapPage() {
  const [marks, settings] = await Promise.all([getRoadmapMarks(), getSettings()]);
  // The calendar day in the user's zone decides "today" for the pace panel and the done stamp.
  const today = calendarDayKey(new Date(), settings.timezone);
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
