import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

function MenuButton({
  editor,
  isActive = false,
  label,
  onClick,
  title,
  disabled = false,
}) {
  return (
    <button
      type="button"
      className={isActive ? "active" : ""}
      aria-pressed={isActive}
      title={title ?? label}
      onClick={onClick}
      disabled={!editor || disabled}
    >
      {label}
    </button>
  );
}

function BlockFormatSelect({ editor }) {
  const currentValue = (() => {
    if (!editor) {
      return "paragraph";
    }

    if (editor.isActive("heading", { level: 1 })) {
      return "heading-1";
    }

    if (editor.isActive("heading", { level: 2 })) {
      return "heading-2";
    }

    if (editor.isActive("heading", { level: 3 })) {
      return "heading-3";
    }

    return "paragraph";
  })();

  function handleChange(event) {
    const value = event.target.value;
    const chain = editor.chain().focus();

    if (value === "paragraph") {
      chain.setParagraph().run();
      return;
    }

    chain.toggleHeading({ level: Number(value.replace("heading-", "")) }).run();
  }

  return (
    <label className="editor-format-select">
      <span>Style</span>
      <select value={currentValue} onChange={handleChange} disabled={!editor}>
        <option value="paragraph">Normal text</option>
        <option value="heading-1">Heading 1</option>
        <option value="heading-2">Heading 2</option>
        <option value="heading-3">Heading 3</option>
      </select>
    </label>
  );
}

function EditorToolbar({ editor }) {
  function handleLink() {
    const previousUrl = editor.getAttributes("link").href;
    const nextUrl = window.prompt("Enter a link URL", previousUrl || "");

    if (nextUrl === null) {
      return;
    }

    if (nextUrl.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    const href = /^https?:\/\//i.test(nextUrl) ? nextUrl : `https://${nextUrl}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  return (
    <div className="editor-toolbar" aria-label="Text formatting controls">
      <div className="editor-toolbar-group">
        <BlockFormatSelect editor={editor} />
      </div>

      <div className="editor-toolbar-group" aria-label="Text style">
        <MenuButton
          editor={editor}
          label="B"
          title="Bold"
          isActive={editor?.isActive("bold") ?? false}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <MenuButton
          editor={editor}
          label="I"
          title="Italic"
          isActive={editor?.isActive("italic") ?? false}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <MenuButton
          editor={editor}
          label="U"
          title="Underline"
          isActive={editor?.isActive("underline") ?? false}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <MenuButton
          editor={editor}
          label="S"
          title="Strikethrough"
          isActive={editor?.isActive("strike") ?? false}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <MenuButton
          editor={editor}
          label="Code"
          title="Inline code"
          isActive={editor?.isActive("code") ?? false}
          onClick={() => editor.chain().focus().toggleCode().run()}
        />
      </div>

      <div className="editor-toolbar-group" aria-label="Lists and blocks">
        <MenuButton
          editor={editor}
          label="Bullets"
          isActive={editor?.isActive("bulletList") ?? false}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <MenuButton
          editor={editor}
          label="Numbered"
          isActive={editor?.isActive("orderedList") ?? false}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <MenuButton
          editor={editor}
          label="Quote"
          isActive={editor?.isActive("blockquote") ?? false}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <MenuButton
          editor={editor}
          label="Rule"
          title="Horizontal line"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />
      </div>

      <div className="editor-toolbar-group" aria-label="Links and cleanup">
        <MenuButton
          editor={editor}
          label="Link"
          isActive={editor?.isActive("link") ?? false}
          onClick={handleLink}
        />
        <MenuButton
          editor={editor}
          label="Unlink"
          disabled={!editor?.isActive("link")}
          onClick={() => editor.chain().focus().unsetLink().run()}
        />
        <MenuButton
          editor={editor}
          label="Clear"
          title="Clear formatting"
          onClick={() =>
            editor.chain().focus().unsetAllMarks().clearNodes().run()
          }
        />
      </div>

      <div className="editor-toolbar-group" aria-label="History">
        <MenuButton
          editor={editor}
          label="Undo"
          disabled={!editor?.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        />
        <MenuButton
          editor={editor}
          label="Redo"
          disabled={!editor?.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        />
      </div>
    </div>
  );
}

function RichTextEditor({
  ariaLabel = "Rich text evaluation draft",
  className = "rich-editor-content",
  content = "",
  onEditorReady,
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TableKit,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        "aria-label": ariaLabel,
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return undefined;
    }

    onEditorReady?.(editor);

    return () => {
      onEditorReady?.(null);
    };
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <>
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} className={className} />
    </>
  );
}

export default RichTextEditor;
