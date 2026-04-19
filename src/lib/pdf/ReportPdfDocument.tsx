import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { FormPayload, ReportData } from "@/lib/types";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  heading: {
    fontSize: 20,
    marginBottom: 8,
    fontWeight: 700,
  },
  subheading: {
    fontSize: 12,
    marginBottom: 12,
    color: "#4b5563",
  },
  section: {
    marginTop: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  sectionTitle: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: 700,
  },
  row: {
    marginBottom: 4,
  },
  bullet: {
    marginBottom: 3,
    marginLeft: 6,
  },
  muted: {
    color: "#6b7280",
  },
});

type Props = {
  report: ReportData;
  profile: Partial<FormPayload> | null;
  reportId: string;
  createdAt: string;
};

export default function ReportPdfDocument({ report, profile, reportId, createdAt }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.heading}>PathPilot Career Risk Report</Text>
        <Text style={styles.subheading}>Report ID: {reportId}</Text>
        <Text style={styles.subheading}>Generated: {new Date(createdAt).toLocaleString()}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Snapshot</Text>
          <Text style={styles.row}>Branch: {profile?.branch || "N/A"}</Text>
          <Text style={styles.row}>Year: {profile?.year || "N/A"}</Text>
          <Text style={styles.row}>Goal: {profile?.goal || "N/A"}</Text>
          <Text style={styles.row}>City: {profile?.city || "N/A"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Risk Summary</Text>
          <Text style={styles.row}>Risk Score: {report.risk_score}/100</Text>
          <Text style={styles.row}>{report.risk_reason}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dead Skills</Text>
          {report.dead_skills.length === 0 ? (
            <Text style={styles.muted}>No major dead-skill flags.</Text>
          ) : (
            report.dead_skills.map((skill) => (
              <Text key={skill} style={styles.bullet}>- {skill}</Text>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safe Skills</Text>
          {report.safe_skills.length === 0 ? (
            <Text style={styles.muted}>No safe-skill indicators found.</Text>
          ) : (
            report.safe_skills.map((skill) => (
              <Text key={skill} style={styles.bullet}>- {skill}</Text>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Primary Pivot</Text>
          <Text style={styles.row}>{report.pivot_1.title}</Text>
          <Text style={styles.row}>{report.pivot_1.why}</Text>
          <Text style={styles.row}>First step: {report.pivot_1.first_step}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12-Week Roadmap</Text>
          {report.week_plan.map((week) => (
            <Text key={week.week} style={styles.bullet}>
              - Week {week.week}: {week.title || week.action}
            </Text>
          ))}
        </View>
      </Page>
    </Document>
  );
}
