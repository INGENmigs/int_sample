import { useRef, useState } from "react";
import DateSelector from "./DateSelector.jsx";

function normalizeCell(value) {
  if (value?.richText) {
    return value.richText
      .map((part) => part.text)
      .join("")
      .trim();
  }

  if (value?.text) {
    return String(value.text).trim();
  }

  if (value?.result !== undefined) {
    return normalizeCell(value.result);
  }

  return value === null || value === undefined ? "" : String(value).trim();
}

function parseRubricRows(sheet) {
  const headerRow = sheet.getRow(1);
  const criterionHeader = normalizeCell(
    headerRow.getCell(1).value,
  ).toLowerCase();
  const weightHeader = normalizeCell(headerRow.getCell(2).value).toLowerCase();

  if (criterionHeader !== "criterion" || weightHeader !== "weight") {
    throw new Error("The first two columns must be Criterion and Weight.");
  }

  const criteria = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const label = normalizeCell(row.getCell(1).value);
    const weight = normalizeCell(row.getCell(2).value);

    if (label || weight) {
      criteria.push({ label, weight });
    }
  });

  return criteria;
}

function TextField({
  id,
  label,
  defaultValue,
  required = false,
  className = "",
  multiline = false,
}) {
  const inputProps = {
    id,
    name: id,
    defaultValue,
  };

  return (
    <label className={`evaluation-field ${className}`} htmlFor={id}>
      <span>
        {label}
        {required ? <strong aria-label="required"> *</strong> : null}
      </span>
      {multiline ? (
        <textarea {...inputProps} />
      ) : (
        <input {...inputProps} type="text" />
      )}
    </label>
  );
}

function InterviewEvaluationForm() {
  const rubricInputRef = useRef(null);
  const [rubricFileName, setRubricFileName] = useState("");
  const [rubricCriteria, setRubricCriteria] = useState({});
  const [rubricError, setRubricError] = useState("");
  const resumeInputRef = useRef(null);
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeSummary, setResumeSummary] = useState("");
  const [resumeError, setResumeError] = useState("");

  function openRubricUpload() {
    setRubricError("");
    if (rubricInputRef.current) {
      rubricInputRef.current.value = "";
      rubricInputRef.current.click();
    }
  }

  async function handleRubricUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const isExcelFile = /\.xlsx$/i.test(file.name);

    if (!isExcelFile) {
      setRubricError("Upload an Excel workbook with an .xlsx extension.");
      return;
    }

    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const firstSheet = workbook.worksheets[0];

      if (!firstSheet) {
        throw new Error(
          "The selected spreadsheet does not contain a worksheet.",
        );
      }

      const parsedCriteria = parseRubricRows(firstSheet);

      setRubricFileName(file.name);
      setRubricCriteria(parsedCriteria);
      setRubricError("");
    } catch (error) {
      setRubricFileName("");
      setRubricCriteria({});
      setRubricError(
        error.message || "Unable to parse the selected spreadsheet.",
      );
    }
  }

  function openResumeUpload() {
    setResumeError("");
    if (resumeInputRef.current) {
      resumeInputRef.current.value = "";
      resumeInputRef.current.click();
    }
  }

  function parseFirstTwoLinesFromText(rawText) {
    return rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 2);
  }

  async function handleResumeUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const isWordFile = /\.(doc|docx)$/i.test(file.name);

    if (!isWordFile) {
      setResumeError("Upload a Word file with a .doc or .docx extension.");
      return;
    }

    try {
      if (/\.doc$/i.test(file.name)) {
        throw new Error(
          "Legacy .doc parsing is not supported in-browser. Please upload a .docx file.",
        );
      }

      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({
        arrayBuffer: await file.arrayBuffer(),
      });
      const firstTwoLines = parseFirstTwoLinesFromText(result.value);

      if (firstTwoLines.length === 0) {
        throw new Error("No text found in the uploaded resume.");
      }

      setResumeFileName(file.name);
      setResumeSummary(firstTwoLines.join(" | "));
      setResumeError("");
    } catch (error) {
      setResumeFileName("");
      setResumeSummary("");
      setResumeError(error.message || "Unable to parse the selected resume.");
    }
  }

  return (
    <form className="evaluation-form" aria-label="Interview evaluation notes">
      <h2>Provide interview notes to generate an Evaluation.</h2>

      <fieldset>
        <legend>Candidate Details</legend>
        <div className="evaluation-grid">
          <TextField id="candidateName" label="Candidate name" />
          <TextField id="candidateRole" label="Role" />
          <TextField id="interviewer" label="Interviewer" />
          <DateSelector
            id="interviewDate"
            name="interviewDate"
            label="Interview date"
            defaultDate={new Date(2026, 3, 22)}
          />
          <TextField
            id="interviewNotes"
            label="Interview notes"
            required
            className="notes-field"
            multiline
          />
        </div>
      </fieldset>

      <fieldset>
        <legend>Rubric & Resume</legend>
        <div className="document-grid">
          <section className="document-panel" aria-labelledby="rubric-title">
            <div className="document-header">
              <h3 id="rubric-title">
                Rubric spreadsheet <span>(required)</span>
              </h3>
              <button type="button" onClick={openRubricUpload}>
                {rubricFileName ? "Replace" : "Upload"}
              </button>
            </div>
            <input
              ref={rubricInputRef}
              id="rubricSpreadsheet"
              className="rubric-upload-input"
              name="rubricSpreadsheet"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleRubricUpload}
            />
            <div className="file-input" aria-live="polite">
              <span className="file-icon spreadsheet-icon">X</span>
              <span
                className={rubricFileName ? "file-name" : "empty-file-name"}
              >
                {rubricFileName || "No spreadsheet uploaded"}
              </span>
            </div>

            {rubricError ? <p className="rubric-error">{rubricError}</p> : null}

            {rubricFileName ? (
              <>
                <div className="parsed-status">
                  <span aria-hidden="true">OK</span>
                  <strong>{rubricCriteria.length} criteria parsed</strong>
                </div>
                <div
                  className="criteria-list"
                  aria-label="Rubric criteria weights"
                >
                  {rubricCriteria.map((item, index) => (
                    <div
                      className="criteria-row"
                      key={`${item.label}-${index}`}
                    >
                      <span>{item.label}</span>
                      <span>{item.weight}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </section>

          <section className="document-panel" aria-labelledby="resume-title">
            <div className="document-header">
              <h3 id="resume-title">
                Resume <span>(optional)</span>
              </h3>
              <button type="button" onClick={openResumeUpload}>
                {resumeFileName ? "Replace" : "Upload"}
              </button>
            </div>
            <input
              ref={resumeInputRef}
              id="resumeUpload"
              className="resume-upload-input"
              name="resumeUpload"
              type="file"
              accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleResumeUpload}
            />
            <div className="file-input" aria-live="polite">
              <span className="file-icon document-icon">W</span>
              <span
                className={resumeFileName ? "file-name" : "empty-file-name"}
              >
                {resumeFileName || "No resume uploaded"}
              </span>
            </div>
            {resumeError ? <p className="rubric-error">{resumeError}</p> : null}
            {resumeSummary ? (
              <p
                className="resume-summary-text"
                aria-label="Parsed resume summary"
              >
                {resumeSummary}
              </p>
            ) : null}
          </section>
        </div>
      </fieldset>

      <button className="generate-button" type="button">
        Generate Evaluation
      </button>
    </form>
  );
}

export default InterviewEvaluationForm;
