import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useParams } from "@tanstack/react-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

const emptyDocumentState = {
  data: null,
  error: "",
  isLoading: false,
  status: "idle",
};

function getDisplayValue(value) {
  return value || "Not provided";
}

function DetailItem({ label, value }) {
  return (
    <div className="editor-detail-item">
      <dt>{label}</dt>
      <dd>{getDisplayValue(value)}</dd>
    </div>
  );
}

function MenuButton({ editor, isActive, label, onClick }) {
  return (
    <button
      type="button"
      className={isActive ? "active" : ""}
      aria-pressed={isActive}
      onClick={onClick}
      disabled={!editor}
    >
      {label}
    </button>
  );
}

function EditorToolbar({ editor }) {
  return (
    <div className="editor-toolbar" aria-label="Text formatting controls">
      <MenuButton
        editor={editor}
        label="B"
        isActive={editor?.isActive("bold") ?? false}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <MenuButton
        editor={editor}
        label="I"
        isActive={editor?.isActive("italic") ?? false}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <MenuButton
        editor={editor}
        label="H2"
        isActive={editor?.isActive("heading", { level: 2 }) ?? false}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <MenuButton
        editor={editor}
        label="List"
        isActive={editor?.isActive("bulletList") ?? false}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <MenuButton
        editor={editor}
        label="1."
        isActive={editor?.isActive("orderedList") ?? false}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <MenuButton
        editor={editor}
        label="Quote"
        isActive={editor?.isActive("blockquote") ?? false}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor?.can().undo()}
      >
        Undo
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor?.can().redo()}
      >
        Redo
      </button>
    </div>
  );
}

function IntakePanel({ documentId, documentState }) {
  if (!documentId) {
    return (
      <aside className="editor-intake-panel" aria-labelledby="intake-title">
        <h3 id="intake-title">Saved document</h3>
        <p>No saved interview document is selected.</p>
      </aside>
    );
  }

  if (documentState.isLoading) {
    return (
      <aside className="editor-intake-panel" aria-labelledby="intake-title">
        <h3 id="intake-title">Saved document</h3>
        <p>Loading saved interview data...</p>
      </aside>
    );
  }

  if (documentState.status === "not-found") {
    return (
      <aside className="editor-intake-panel" aria-labelledby="intake-title">
        <h3 id="intake-title">Saved document</h3>
        <p>The selected interview document was not found.</p>
      </aside>
    );
  }

  if (documentState.error) {
    return (
      <aside className="editor-intake-panel" aria-labelledby="intake-title">
        <h3 id="intake-title">Saved document</h3>
        <p role="alert">{documentState.error}</p>
      </aside>
    );
  }

  if (!documentState.data) {
    return null;
  }

  const interview = documentState.data;
  const rubricCriteria = Array.isArray(interview.rubric?.criteria)
    ? interview.rubric.criteria
    : [];

  return (
    <aside className="editor-intake-panel" aria-labelledby="intake-title">
      <h3 id="intake-title">Saved document</h3>
      <dl className="editor-detail-list">
        <DetailItem label="Candidate" value={interview.candidateName} />
        <DetailItem label="Role" value={interview.candidateRole} />
        <DetailItem label="Interviewer" value={interview.interviewer} />
        <DetailItem label="Interview date" value={interview.interviewDate} />
        <DetailItem label="Rubric" value={interview.rubric?.fileName} />
        <DetailItem label="Resume" value={interview.resume?.fileName} />
      </dl>

      {interview.resume?.summary ? (
        <section className="editor-reference-block" aria-labelledby="resume-summary-title">
          <h4 id="resume-summary-title">Resume summary</h4>
          <p>{interview.resume.summary}</p>
        </section>
      ) : null}

      <section className="editor-reference-block" aria-labelledby="notes-title">
        <h4 id="notes-title">Interview notes</h4>
        <p>{interview.interviewNotes}</p>
      </section>

      {rubricCriteria.length > 0 ? (
        <section className="editor-reference-block" aria-labelledby="rubric-title">
          <h4 id="rubric-title">Rubric criteria</h4>
          <ul className="editor-criteria-list">
            {rubricCriteria.map((criterion, index) => (
              <li key={`${criterion.label}-${index}`}>
                <span>{criterion.label || "Untitled criterion"}</span>
                <strong>{criterion.weight || "No weight"}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}

function EditorPage() {
  const params = useParams({ strict: false });
  const documentId = params.documentId;
  const [documentState, setDocumentState] = useState(emptyDocumentState);
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editorProps: {
      attributes: {
        "aria-label": "Rich text evaluation draft",
      },
    },
  });

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
  }, [documentId]);

  return (
    <section className="home-content editor-page" aria-labelledby="editor-title">
      <header className="editor-page-header">
        <h2 id="editor-title">Editor</h2>
        <p>Draft evaluation content while reviewing the saved intake data.</p>
      </header>

      <div className="editor-workspace">
        <IntakePanel documentId={documentId} documentState={documentState} />

        <section className="rich-editor-panel" aria-labelledby="draft-title">
          <div className="rich-editor-header">
            <h3 id="draft-title">Evaluation draft</h3>
            <span>Browser-only draft</span>
          </div>
          <EditorToolbar editor={editor} />
          <EditorContent editor={editor} className="rich-editor-content" />
        </section>
      </div>
    </section>
  );
}

export default EditorPage;
