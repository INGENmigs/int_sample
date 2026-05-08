import { useRef, useState } from "react";
import { getAuth } from "firebase/auth";
import {
  Bytes,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "@tanstack/react-router";
import DateSelector from "./DateSelector.jsx";

const MAX_FIRESTORE_FILE_BYTES = 850 * 1024;

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
  const navigate = useNavigate();
  const formRef = useRef(null);
  const rubricInputRef = useRef(null);
  const [rubricFileName, setRubricFileName] = useState("");
  const [rubricFile, setRubricFile] = useState(null);
  const [rubricCriteria, setRubricCriteria] = useState([]);
  const [rubricError, setRubricError] = useState("");
  const resumeInputRef = useRef(null);
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeSummary, setResumeSummary] = useState("");
  const [resumeError, setResumeError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function openRubricUpload() {
    setRubricError("");
    setSaveError("");
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
      setRubricFileName("");
      setRubricFile(null);
      setRubricCriteria([]);
      setRubricError("Upload an Excel workbook with an .xlsx extension.");
      return;
    }

    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      const firstSheet = workbook.worksheets[0];

      if (!firstSheet) {
        throw new Error(
          "The selected spreadsheet does not contain a worksheet.",
        );
      }

      const parsedCriteria = parseRubricRows(firstSheet);

      setRubricFileName(file.name);
      setRubricFile({
        bytes: new Uint8Array(arrayBuffer),
        contentType: file.type,
        fileName: file.name,
        size: file.size,
      });
      setRubricCriteria(parsedCriteria);
      setRubricError("");
      setSaveError("");
    } catch (error) {
      setRubricFileName("");
      setRubricFile(null);
      setRubricCriteria([]);
      setRubricError(
        error.message || "Unable to parse the selected spreadsheet.",
      );
    }
  }

  function openResumeUpload() {
    setResumeError("");
    setSaveError("");
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
      setResumeFileName("");
      setResumeFile(null);
      setResumeSummary("");
      setResumeError("Upload a Word file with a .doc or .docx extension.");
      return;
    }

    try {
      if (/\.doc$/i.test(file.name)) {
        throw new Error(
          "Legacy .doc parsing is not supported in-browser. Please upload a .docx file.",
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({
        arrayBuffer,
      });
      const firstTwoLines = parseFirstTwoLinesFromText(result.value);

      if (firstTwoLines.length === 0) {
        throw new Error("No text found in the uploaded resume.");
      }

      setResumeFileName(file.name);
      setResumeFile({
        bytes: new Uint8Array(arrayBuffer),
        contentType: file.type,
        fileName: file.name,
        size: file.size,
      });
      setResumeSummary(firstTwoLines.join(" | "));
      setResumeError("");
      setSaveError("");
    } catch (error) {
      setResumeFileName("");
      setResumeFile(null);
      setResumeSummary("");
      setResumeError(error.message || "Unable to parse the selected resume.");
    }
  }

  async function handleGenerateEvaluation() {
    const form = formRef.current;

    if (!form || isSaving) {
      return;
    }

    setSaveError("");

    const formData = new FormData(form);
    const interviewNotes = formData.get("interviewNotes")?.toString().trim();

    if (!interviewNotes) {
      setSaveError("Interview notes are required before generating an evaluation.");
      return;
    }

    if (!rubricFile) {
      setSaveError("Upload a valid Excel rubric before generating an evaluation.");
      return;
    }

    const totalFileBytes = rubricFile.size + (resumeFile?.size ?? 0);

    if (totalFileBytes > MAX_FIRESTORE_FILE_BYTES) {
      setSaveError(
        "The uploaded files are too large to store in Firestore. Keep the combined file size under 850 KB.",
      );
      return;
    }

    const { app, db } = await import("../firebase/client.js");
    const auth = getAuth(app);
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setSaveError("Your sign-in session has expired. Sign in again before saving.");
      return;
    }

    setIsSaving(true);

    try {
      const docRef = await addDoc(collection(db, "interview-details"), {
        candidateName: formData.get("candidateName")?.toString().trim() ?? "",
        candidateRole: formData.get("candidateRole")?.toString().trim() ?? "",
        interviewer: formData.get("interviewer")?.toString().trim() ?? "",
        interviewDate: formData.get("interviewDate")?.toString().trim() ?? "",
        interviewNotes,
        rubric: {
          bytes: Bytes.fromUint8Array(rubricFile.bytes),
          contentType: rubricFile.contentType,
          criteria: rubricCriteria,
          fileName: rubricFile.fileName,
          size: rubricFile.size,
        },
        resume: resumeFile
          ? {
              bytes: Bytes.fromUint8Array(resumeFile.bytes),
              contentType: resumeFile.contentType,
              fileName: resumeFile.fileName,
              size: resumeFile.size,
              summary: resumeSummary,
            }
          : null,
        createdAt: serverTimestamp(),
        createdByUid: currentUser.uid,
      });

      await navigate({
        to: "/editor/$documentId",
        params: { documentId: docRef.id },
      });
    } catch (error) {
      console.error("Unable to save evaluation details.", error);
      setSaveError(
        error.message || "Unable to save evaluation details. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      ref={formRef}
      className="evaluation-form"
      aria-label="Interview evaluation notes"
    >
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

      {saveError ? (
        <p className="rubric-error" role="alert">
          {saveError}
        </p>
      ) : null}

      <button
        className="generate-button"
        type="button"
        disabled={isSaving}
        onClick={handleGenerateEvaluation}
      >
        {isSaving ? "Saving..." : "Generate Evaluation"}
      </button>
    </form>
  );
}

export default InterviewEvaluationForm;
