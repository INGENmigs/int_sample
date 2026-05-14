import { useParams } from "@tanstack/react-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { textToEditorHtml } from "../components/MarkdownParser.jsx";
import RichTextEditor from "../components/RichTextEditor.jsx";

const emptyDocumentState = {
  data: null,
  error: "",
  isLoading: false,
  status: "idle",
};

const evaluationPromptTemplateId = "evaluation-prompt";

function preparePromptData(interview) {
  const rubricCriteria = Array.isArray(interview.rubric?.criteria)
    ? interview.rubric.criteria
    : [];
  const promptData = {
    candidateName: interview.candidateName ?? "",
    candidateRole: interview.candidateRole ?? "",
    interviewer: interview.interviewer ?? "",
    interviewDate: interview.interviewDate ?? "",
    interviewNotes: interview.interviewNotes ?? "",
    resume: {
      fileName: interview.resume?.fileName ?? "",
      summary: interview.resume?.summary ?? "",
    },
    rubric: {
      fileName: interview.rubric?.fileName ?? "",
      criteria: rubricCriteria,
    },
  };

  return {
    ...promptData,
    rubricCriteria,
    rubricCriteriaJson: JSON.stringify(rubricCriteria, null, 2),
    resumeSummary: promptData.resume.summary,
    interview: promptData,
    interviewJson: JSON.stringify(promptData, null, 2),
  };
}

function EditorPage() {
  const params = useParams({ strict: false });
  const documentId = params.documentId;
  const [, setDocumentState] = useState(emptyDocumentState);
  const [draftStatus, setDraftStatus] = useState("Browser-only draft");
  const [editor, setEditor] = useState(null);
  const generatedDocumentIdRef = useRef(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadInterviewDocument() {
      if (!documentId) {
        setDocumentState(emptyDocumentState);
        return;
      }

      setDocumentState({
        data: null,
        error: "",
        isLoading: true,
        status: "loading",
      });

      try {
        const { app, db } = await import("../firebase/client.js");
        const auth = getAuth(app);
        const currentUser =
          auth.currentUser ??
          (await new Promise((resolve) => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
              unsubscribe();
              resolve(user);
            });
          }));

        if (!currentUser) {
          setDocumentState({
            data: null,
            error: "Your sign-in session has expired. Sign in again to read this document.",
            isLoading: false,
            status: "error",
          });
          return;
        }

        const documentSnapshot = await getDoc(
          doc(db, "interview-details", documentId),
        );

        if (!isCurrent) {
          return;
        }

        if (!documentSnapshot.exists()) {
          setDocumentState({
            data: null,
            error: "",
            isLoading: false,
            status: "not-found",
          });
          return;
        }

        setDocumentState({
          data: documentSnapshot.data(),
          error: "",
          isLoading: false,
          status: "ready",
        });

        if (editor && generatedDocumentIdRef.current !== documentId) {
          generatedDocumentIdRef.current = documentId;
          setDraftStatus("Generating evaluation...");

          try {
            const { templateGenerativeModel } = await import(
              "../firebase/client.js"
            );
            const result = await templateGenerativeModel.generateContent(
              evaluationPromptTemplateId,
              preparePromptData(documentSnapshot.data()),
            );
            const generatedText = result.response.text();

            if (!isCurrent) {
              return;
            }

            editor.commands.setContent(textToEditorHtml(generatedText));
            setDraftStatus("Generated from evaluation prompt");
          } catch (generationError) {
            if (!isCurrent) {
              return;
            }

            console.error("Unable to generate evaluation draft.", generationError);
            setDraftStatus(
              generationError instanceof Error
                ? generationError.message
                : "Unable to generate evaluation draft.",
            );
          }
        }
      } catch (error) {
        if (!isCurrent) {
          return;
        }

        console.error("Unable to load interview document.", error);
        setDocumentState({
          data: null,
          error:
            error.code === "permission-denied"
              ? "You do not have permission to read this interview document."
              : "Unable to load this interview document.",
          isLoading: false,
          status: "error",
        });
      }
    }

    loadInterviewDocument();

    return () => {
      isCurrent = false;
    };
  }, [documentId, editor]);

  return (
    <section className="home-content editor-page">
      <div className="editor-workspace">
        <section className="rich-editor-panel" aria-labelledby="draft-title">
          <div className="rich-editor-header">
            <h3 id="draft-title">Evaluation draft</h3>
            <span>{draftStatus}</span>
          </div>
          <RichTextEditor onEditorReady={setEditor} />
        </section>
      </div>
    </section>
  );
}

export default EditorPage;
