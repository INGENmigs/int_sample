import { useParams } from "@tanstack/react-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const [draftStatus, setDraftStatus] = useState("Looking for document data...");
  const [isEditorEnabled, setIsEditorEnabled] = useState(false);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [editor, setEditor] = useState(null);
  const generatedDocumentIdRef = useRef(null);
  const editorIdleTimerRef = useRef(null);

  const clearEditorIdleTimer = useCallback(() => {
    if (editorIdleTimerRef.current) {
      window.clearTimeout(editorIdleTimerRef.current);
      editorIdleTimerRef.current = null;
    }
  }, []);

  const scheduleReadyToEditStatus = useCallback(() => {
    clearEditorIdleTimer();
    editorIdleTimerRef.current = window.setTimeout(() => {
      setDraftStatus("Ready to Edit");
      editorIdleTimerRef.current = null;
    }, 2000);
  }, [clearEditorIdleTimer]);

  const handleEditorFocus = useCallback(() => {
    if (!isEditorEnabled) {
      return;
    }

    setDraftStatus("Editing...");
  }, [isEditorEnabled]);

  const handleEditorActivity = useCallback(() => {
    if (!isEditorEnabled) {
      return;
    }

    setDraftStatus("Editing...");
    scheduleReadyToEditStatus();
  }, [isEditorEnabled, scheduleReadyToEditStatus]);

  useEffect(() => {
    if (!isEditorEnabled) {
      clearEditorIdleTimer();
    }
  }, [clearEditorIdleTimer, isEditorEnabled]);

  useEffect(() => {
    let isCurrent = true;

    async function loadInterviewDocument() {
      clearEditorIdleTimer();
      setIsEditorEnabled(false);
      setDraftStatus("Looking for document data...");

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
          clearEditorIdleTimer();
          setDocumentState({
            data: null,
            error: "Your sign-in session has expired. Sign in again to read this document.",
            isLoading: false,
            status: "error",
          });
          setDraftStatus("Your sign-in session has expired. Sign in again to read this document.");
          return;
        }

        const documentSnapshot = await getDoc(
          doc(db, "interview-details", documentId),
        );

        if (!isCurrent) {
          return;
        }

        if (!documentSnapshot.exists()) {
          clearEditorIdleTimer();
          setDocumentState({
            data: null,
            error: "",
            isLoading: false,
            status: "not-found",
          });
          setDraftStatus("Document not found.");
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
          setDraftStatus("Looking for document data...");

          try {
            const evaluationDraftRef = doc(db, "evaluation-docu", documentId);
            const evaluationDraftSnapshot = await getDoc(evaluationDraftRef);

            if (!isCurrent) {
              return;
            }

            if (evaluationDraftSnapshot.exists()) {
              const savedDraft = evaluationDraftSnapshot.data();

              editor.commands.setContent(savedDraft.draftHtml ?? "");
              setIsEditorEnabled(true);
              setDraftStatus("Document loaded");
              return;
            }

            setDraftStatus("Generating document...");

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

            const generatedHtml = textToEditorHtml(generatedText);

            editor.commands.setContent(generatedHtml);
            await setDoc(evaluationDraftRef, {
              documentId,
              draftHtml: generatedHtml,
              promptTemplateId: evaluationPromptTemplateId,
              createdAt: serverTimestamp(),
              createdByUid: currentUser.uid,
              isFinal: false,
            });

            if (!isCurrent) {
              return;
            }

            setIsEditorEnabled(true);
            setDraftStatus("Document generated");
          } catch (generationError) {
            if (!isCurrent) {
              return;
            }

            clearEditorIdleTimer();
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

        clearEditorIdleTimer();
        console.error("Unable to load interview document.", error);
        const errorMessage =
          error.code === "permission-denied"
            ? "You do not have permission to read this interview document."
            : "Unable to load this interview document.";

        setDocumentState({
          data: null,
          error: errorMessage,
          isLoading: false,
          status: "error",
        });
        setDraftStatus(errorMessage);
      }
    }

    loadInterviewDocument();

    return () => {
      isCurrent = false;
      clearEditorIdleTimer();
    };
  }, [clearEditorIdleTimer, documentId, editor]);

  const handleSaveDocument = useCallback(
    async ({ isFinal }) => {
      if (!documentId || !editor || isSavingDraft) {
        return;
      }

      clearEditorIdleTimer();
      setIsSaveMenuOpen(false);
      setIsSavingDraft(true);
      setDraftStatus("Saving...");

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
          setDraftStatus("Your sign-in session has expired. Sign in again to save this document.");
          return;
        }

        await updateDoc(doc(db, "evaluation-docu", documentId), {
          draftHtml: editor.getHTML(),
          isFinal,
        });

        setDraftStatus(isFinal ? "Document saved" : "Draft saved");
      } catch (error) {
        console.error("Unable to save evaluation draft.", error);
        setDraftStatus(
          error instanceof Error ? error.message : "Unable to save evaluation draft.",
        );
      } finally {
        setIsSavingDraft(false);
      }
    },
    [clearEditorIdleTimer, documentId, editor, isSavingDraft],
  );

  return (
    <section className="home-content editor-page">
      <div className="editor-workspace">
        <section className="rich-editor-panel" aria-label="Evaluation draft">
          <div className="rich-editor-header">
            <div className="editor-save-actions">
              <button
                type="button"
                className="editor-primary-action"
                disabled={!isEditorEnabled || isSavingDraft}
                onClick={() => handleSaveDocument({ isFinal: true })}
              >
                Save &amp; Next
              </button>
              <div className="editor-save-menu">
                <button
                  type="button"
                  className="editor-menu-trigger"
                  aria-expanded={isSaveMenuOpen}
                  aria-label="More save options"
                  disabled={!isEditorEnabled || isSavingDraft}
                  onClick={() => setIsSaveMenuOpen((isOpen) => !isOpen)}
                >
                  <span aria-hidden="true">v</span>
                </button>
                {isSaveMenuOpen ? (
                  <div className="editor-save-menu-list" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleSaveDocument({ isFinal: false })}
                    >
                      Save as draft
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            <span className="editor-status">{draftStatus}</span>
          </div>
          <RichTextEditor
            disabled={!isEditorEnabled}
            onEditorActivity={handleEditorActivity}
            onEditorFocus={handleEditorFocus}
            onEditorReady={setEditor}
          />
        </section>
      </div>
    </section>
  );
}

export default EditorPage;
