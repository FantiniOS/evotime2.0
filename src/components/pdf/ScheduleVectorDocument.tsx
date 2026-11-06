import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  Svg,
  Rect,
  Path,
  StyleSheet,
} from "@react-pdf/renderer";

export type VectorReportVision = "turmas" | "professores" | "mapa_geral";
export type ShiftOption = "Manhã" | "Tarde" | "Noite";

export interface VectorLessonCell {
  subject: string;
  teacher: string;
  room: string;
  code: string;
  tone: "indigo" | "emerald" | "amber" | "purple" | "sky" | "rose";
}

export interface VectorScheduleSheet {
  id: string;
  name: string;
  yearGroup: string;
  shift: ShiftOption;
  shiftLabel: string;
  room: string;
  coordinator: string;
  periods: {
    periodLabel: string;
    isBreak?: boolean;
    days: Record<
      "seg" | "ter" | "qua" | "qui" | "sex" | "sab",
      VectorLessonCell
    >;
  }[];
}

export interface VectorSchoolMetadata {
  name: string;
  subtitle: string;
  cnpjOrInep: string;
  logoDataUrl?: string;
}

export interface ScheduleVectorDocumentProps {
  school: VectorSchoolMetadata;
  vision: VectorReportVision;
  selectedShift: ShiftOption;
  sheets: VectorScheduleSheet[];
  allShiftTurmas: VectorScheduleSheet[];
  grayscaleMode: boolean;
  hideWeekends: boolean;
  showTeacherName: boolean;
  forcePageBreak: boolean;
  generatedAt: string;
  academicYear?: string;
}

const PASTEL_PALETTE: Record<
  VectorLessonCell["tone"],
  { bg: string; border: string; badgeBg: string; text: string; sub: string }
> = {
  indigo: {
    bg: "#eef2ff",
    border: "#c7d2fe",
    badgeBg: "#4f46e5",
    text: "#1e1b4b",
    sub: "#4338ca",
  },
  emerald: {
    bg: "#ecfdf5",
    border: "#a7f3d0",
    badgeBg: "#059669",
    text: "#064e3b",
    sub: "#047857",
  },
  amber: {
    bg: "#fffbeb",
    border: "#fde68a",
    badgeBg: "#d97706",
    text: "#451a03",
    sub: "#b45309",
  },
  purple: {
    bg: "#faf5ff",
    border: "#e9d5ff",
    badgeBg: "#7c3aed",
    text: "#3b0764",
    sub: "#6d28d9",
  },
  sky: {
    bg: "#f0f9ff",
    border: "#bae6fd",
    badgeBg: "#0284c7",
    text: "#0c4a6e",
    sub: "#0369a1",
  },
  rose: {
    bg: "#fff1f2",
    border: "#fecdd3",
    badgeBg: "#e11d48",
    text: "#4c0519",
    sub: "#be123c",
  },
};

const GRAYSCALE_PALETTE = {
  bg: "#f8fafc",
  border: "#cbd5e1",
  badgeBg: "#334155",
  text: "#0f172a",
  sub: "#475569",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingBottom: 34,
    paddingHorizontal: 28,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    width: "28%",
  },
  logoBox: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  logoImage: {
    width: 34,
    height: 34,
    borderRadius: 6,
    objectFit: "cover",
    marginRight: 8,
  },
  headerLeftTextWrap: {
    flexDirection: "column",
  },
  headerLeftTag: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#4f46e5",
    textTransform: "uppercase",
  },
  headerLeftDoc: {
    fontSize: 7.5,
    color: "#64748b",
    marginTop: 1,
  },
  headerCenter: {
    width: "44%",
    alignItems: "center",
    justifyContent: "center",
  },
  schoolNameSerif: {
    fontFamily: "Times-Bold",
    fontSize: 16,
    color: "#0f172a",
    textAlign: "center",
  },
  schoolSubtitleSerif: {
    fontFamily: "Times-Italic",
    fontSize: 9.5,
    color: "#475569",
    textAlign: "center",
    marginTop: 2,
  },
  headerRight: {
    width: "28%",
    alignItems: "flex-end",
  },
  academicYearBadge: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    backgroundColor: "#f1f5f9",
    paddingVertical: 2.5,
    paddingHorizontal: 7,
    borderRadius: 4,
  },
  generatedDateText: {
    fontSize: 7.5,
    color: "#64748b",
    marginTop: 3,
  },
  sectionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderWidth: 0.75,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  sectionMeta: {
    fontSize: 8.5,
    color: "#475569",
  },
  tableOuter: {
    borderWidth: 0.75,
    borderColor: "#94a3b8",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 10,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    borderBottomWidth: 0.75,
    borderBottomColor: "#334155",
  },
  periodHeaderCell: {
    width: "11%",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRightWidth: 0.75,
    borderRightColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  dayHeaderCell: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRightWidth: 0.75,
    borderRightColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCellText: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.75,
    borderBottomColor: "#cbd5e1",
    minHeight: 54,
  },
  breakRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 0.75,
    borderBottomColor: "#cbd5e1",
    minHeight: 20,
    alignItems: "center",
  },
  periodLabelCell: {
    width: "11%",
    backgroundColor: "#f8fafc",
    borderRightWidth: 0.75,
    borderRightColor: "#cbd5e1",
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  periodLabelTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  periodLabelSub: {
    fontSize: 6.5,
    color: "#64748b",
    marginTop: 1,
  },
  daySlotWrapper: {
    flex: 1,
    padding: 3.5,
    borderRightWidth: 0.75,
    borderRightColor: "#cbd5e1",
  },
  lessonCard: {
    flex: 1,
    borderRadius: 4,
    borderWidth: 0.75,
    paddingVertical: 4,
    paddingHorizontal: 5,
    justifyContent: "space-between",
  },
  lessonTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  codeBadge: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    paddingVertical: 1,
    paddingHorizontal: 3.5,
    borderRadius: 2,
  },
  roomLabel: {
    fontSize: 6.5,
    color: "#64748b",
  },
  subjectTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
  },
  teacherSubtitle: {
    fontSize: 7,
    marginTop: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 28,
    right: 28,
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerSideText: {
    fontSize: 7,
    color: "#64748b",
  },
  footerPageNumber: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    textAlign: "center",
  },
});

export default function ScheduleVectorDocument({
  school,
  vision,
  selectedShift,
  sheets,
  allShiftTurmas,
  grayscaleMode,
  hideWeekends,
  showTeacherName,
  forcePageBreak,
  generatedAt,
  academicYear = "Ano Letivo 2026",
}: ScheduleVectorDocumentProps) {
  const visibleDays: {
    key: "seg" | "ter" | "qua" | "qui" | "sex" | "sab";
    label: string;
  }[] = [
    { key: "seg", label: "Segunda-feira" },
    { key: "ter", label: "Terça-feira" },
    { key: "qua", label: "Quarta-feira" },
    { key: "qui", label: "Quinta-feira" },
    { key: "sex", label: "Sexta-feira" },
    ...(hideWeekends ? [] : [{ key: "sab" as const, label: "Sábado Letivo" }]),
  ];

  const getPalette = (tone: VectorLessonCell["tone"]) =>
    grayscaleMode ? GRAYSCALE_PALETTE : PASTEL_PALETTE[tone];

  const renderOfficialHeader = () => (
    <View style={styles.headerContainer} fixed>
      {/* Esquerda: Logo da Instituição + Código INEP/CNPJ */}
      <View style={styles.headerLeft}>
        {school.logoDataUrl ? (
          <Image src={school.logoDataUrl} style={styles.logoImage} />
        ) : (
          <View
            style={[
              styles.logoBox,
              grayscaleMode ? { backgroundColor: "#1e293b" } : {},
            ]}
          >
            <Svg width="18" height="18" viewBox="0 0 24 24">
              <Rect x="3" y="4" width="18" height="16" rx="2" fill="#ffffff" />
              <Path d="M7 8h10v2H7zM7 12h6v2H7z" fill="#4f46e5" />
            </Svg>
          </View>
        )}
        <View style={styles.headerLeftTextWrap}>
          <Text
            style={[
              styles.headerLeftTag,
              grayscaleMode ? { color: "#1e293b" } : {},
            ]}
          >
            EvoTime 2.0 • Documento Oficial
          </Text>
          <Text style={styles.headerLeftDoc}>{school.cnpjOrInep}</Text>
        </View>
      </View>

      {/* Centro: Nome da Escola em Fonte Serifada Elegante */}
      <View style={styles.headerCenter}>
        <Text style={styles.schoolNameSerif}>{school.name}</Text>
        <Text style={styles.schoolSubtitleSerif}>
          {school.subtitle} •{" "}
          {vision === "turmas"
            ? "Relatório Oficial de Grade por Turmas"
            : vision === "professores"
            ? "Relatório Oficial de Grade Docente"
            : `Mapa Geral da Escola • Turno: ${selectedShift}`}
        </Text>
      </View>

      {/* Direita: Ano Letivo e Data de Geração */}
      <View style={styles.headerRight}>
        <Text style={styles.academicYearBadge}>{academicYear}</Text>
        <Text style={styles.generatedDateText}>Gerado em {generatedAt}</Text>
      </View>
    </View>
  );

  const renderOfficialFooter = () => (
    <View style={styles.footer} fixed>
      <Text style={styles.footerSideText}>
        {school.name} • Motor Matemático CP-SAT (Zero Conflitos)
      </Text>
      <Text
        style={styles.footerPageNumber}
        render={({ pageNumber, totalPages }) =>
          `Página ${pageNumber} de ${totalPages}`
        }
      />
      <Text style={styles.footerSideText}>
        PDF Vetorial A4 Paisagem • EvoTime 2.0
      </Text>
    </View>
  );

  // Renderização de 1 Tabela Completa (Grade por Turma ou Grade por Professor)
  const renderSingleEntityTable = (
    sheet: VectorScheduleSheet,
    index: number
  ) => (
    <View
      key={sheet.id}
      wrap={false}
      break={forcePageBreak && index > 0}
      style={{ marginBottom: 10 }}
    >
      <View style={styles.sectionBanner}>
        <Text style={styles.sectionTitle}>
          Horário Escolar — {sheet.name}
        </Text>
        <Text style={styles.sectionMeta}>
          {sheet.shiftLabel} • {sheet.room} • {sheet.coordinator}
        </Text>
      </View>

      <View style={styles.tableOuter}>
        {/* Cabeçalho da Tabela */}
        <View style={styles.tableHeaderRow}>
          <View style={styles.periodHeaderCell}>
            <Text style={styles.headerCellText}>Período</Text>
          </View>
          {visibleDays.map((day, dIdx) => (
            <View
              key={day.key}
              style={[
                styles.dayHeaderCell,
                dIdx === visibleDays.length - 1 ? { borderRightWidth: 0 } : {},
              ]}
            >
              <Text style={styles.headerCellText}>{day.label}</Text>
            </View>
          ))}
        </View>

        {/* Linhas dos Períodos (1ª a 5ª Aula + Intervalo) */}
        {sheet.periods.map((periodRow, pIdx) => {
          const isLastRow = pIdx === sheet.periods.length - 1;

          if (periodRow.isBreak) {
            return (
              <View
                key={periodRow.periodLabel}
                style={[
                  styles.breakRow,
                  isLastRow ? { borderBottomWidth: 0 } : {},
                ]}
              >
                <View
                  style={[
                    styles.periodLabelCell,
                    { backgroundColor: "#e2e8f0", paddingVertical: 3 },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 7,
                      fontFamily: "Helvetica-Bold",
                      color: "#475569",
                      textTransform: "uppercase",
                    }}
                  >
                    {periodRow.periodLabel}
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 7,
                      fontFamily: "Helvetica-Bold",
                      color: "#64748b",
                      textTransform: "uppercase",
                    }}
                  >
                    Intervalo Pedagógico entre Períodos
                  </Text>
                </View>
              </View>
            );
          }

          return (
            <View
              key={periodRow.periodLabel}
              style={[
                styles.tableRow,
                isLastRow ? { borderBottomWidth: 0 } : {},
              ]}
            >
              <View style={styles.periodLabelCell}>
                <Text style={styles.periodLabelTitle}>
                  {periodRow.periodLabel}
                </Text>
                <Text style={styles.periodLabelSub}>Regular</Text>
              </View>

              {visibleDays.map((day, dIdx) => {
                const cell = periodRow.days[day.key];
                const palette = getPalette(cell.tone);
                return (
                  <View
                    key={`${periodRow.periodLabel}-${day.key}`}
                    style={[
                      styles.daySlotWrapper,
                      dIdx === visibleDays.length - 1
                        ? { borderRightWidth: 0 }
                        : {},
                    ]}
                  >
                    <View
                      style={[
                        styles.lessonCard,
                        {
                          backgroundColor: palette.bg,
                          borderColor: palette.border,
                        },
                      ]}
                    >
                      <View style={styles.lessonTopRow}>
                        <Text
                          style={[
                            styles.codeBadge,
                            { backgroundColor: palette.badgeBg },
                          ]}
                        >
                          {cell.code}
                        </Text>
                        <Text style={styles.roomLabel}>{cell.room}</Text>
                      </View>

                      <View>
                        <Text
                          style={[styles.subjectTitle, { color: palette.text }]}
                        >
                          {cell.subject}
                        </Text>
                        {showTeacherName && (
                          <Text
                            style={[
                              styles.teacherSubtitle,
                              { color: palette.sub },
                            ]}
                          >
                            {cell.teacher}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    </View>
  );

  // Renderização da Visão Expandida "Mapa Geral da Escola" (Cruza todas as turmas e professores do turno)
  const renderMasterSchoolMap = () => {
    const regularPeriods = ["1ª Aula", "2ª Aula", "3ª Aula", "4ª Aula", "5ª Aula"];

    return (
      <View>
        {visibleDays.map((day, dayIndex) => (
          <View
            key={day.key}
            wrap={false}
            break={dayIndex > 0 && dayIndex % 2 === 0}
            style={{ marginBottom: 12 }}
          >
            <View style={styles.sectionBanner}>
              <Text style={styles.sectionTitle}>
                Mapa Geral Cruzado ({selectedShift}) — {day.label}
              </Text>
              <Text style={styles.sectionMeta}>
                Cruzamento simultâneo de {allShiftTurmas.length} turmas e corpo
                docente • Turno da {selectedShift}
              </Text>
            </View>

            <View style={styles.tableOuter}>
              {/* Cabeçalho: Coluna Período + Todas as Turmas do Turno */}
              <View style={styles.tableHeaderRow}>
                <View style={[styles.periodHeaderCell, { width: "10%" }]}>
                  <Text style={styles.headerCellText}>Período</Text>
                </View>
                {allShiftTurmas.map((turma, tIdx) => (
                  <View
                    key={turma.id}
                    style={[
                      styles.dayHeaderCell,
                      tIdx === allShiftTurmas.length - 1
                        ? { borderRightWidth: 0 }
                        : {},
                    ]}
                  >
                    <Text style={styles.headerCellText}>{turma.name}</Text>
                  </View>
                ))}
              </View>

              {/* Linhas: 1ª a 5ª Aula daquele dia em todas as turmas */}
              {regularPeriods.map((pLabel, pIdx) => {
                const isLast = pIdx === regularPeriods.length - 1;
                return (
                  <View
                    key={`${day.key}-${pLabel}`}
                    style={[
                      styles.tableRow,
                      { minHeight: 38 },
                      isLast ? { borderBottomWidth: 0 } : {},
                    ]}
                  >
                    <View style={[styles.periodLabelCell, { width: "10%" }]}>
                      <Text style={styles.periodLabelTitle}>{pLabel}</Text>
                    </View>

                    {allShiftTurmas.map((turma, tIdx) => {
                      const foundPeriod = turma.periods.find(
                        (p) => p.periodLabel === pLabel
                      );
                      const cell = foundPeriod?.days[day.key];
                      if (!cell) {
                        return (
                          <View
                            key={`${turma.id}-${pLabel}`}
                            style={styles.daySlotWrapper}
                          />
                        );
                      }
                      const palette = getPalette(cell.tone);
                      return (
                        <View
                          key={`${turma.id}-${pLabel}`}
                          style={[
                            styles.daySlotWrapper,
                            tIdx === allShiftTurmas.length - 1
                              ? { borderRightWidth: 0 }
                              : {},
                          ]}
                        >
                          <View
                            style={[
                              styles.lessonCard,
                              {
                                backgroundColor: palette.bg,
                                borderColor: palette.border,
                                paddingVertical: 3,
                              },
                            ]}
                          >
                            <View style={styles.lessonTopRow}>
                              <Text
                                style={[
                                  styles.codeBadge,
                                  { backgroundColor: palette.badgeBg },
                                ]}
                              >
                                {cell.code}
                              </Text>
                              <Text style={styles.roomLabel}>{cell.room}</Text>
                            </View>
                            <Text
                              style={[
                                styles.subjectTitle,
                                { color: palette.text, fontSize: 7.5 },
                              ]}
                            >
                              {cell.subject}
                            </Text>
                            <Text
                              style={[
                                styles.teacherSubtitle,
                                { color: palette.sub, fontSize: 6.5 },
                              ]}
                            >
                              {cell.teacher}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <Document
      title={`${school.name} - Relatório Oficial de Horários`}
      author="EvoTime 2.0 Motor IA"
      subject="Grade Horária Escolar Oficial A4"
    >
      <Page size="A4" orientation="landscape" style={styles.page} wrap={true}>
        {renderOfficialHeader()}

        {vision === "mapa_geral"
          ? renderMasterSchoolMap()
          : sheets.map((sheet, index) => renderSingleEntityTable(sheet, index))}

        {renderOfficialFooter()}
      </Page>
    </Document>
  );
}
