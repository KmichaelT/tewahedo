import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onCategoryChange?: (category: string) => void;
  onTagsChange?: (tags: string) => void;
  category?: string;
  tags?: string;
  placeholder?: string;
  readOnly?: boolean;
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'script': 'sub'}, { 'script': 'super' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'direction': 'rtl' }],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'align': [] }],
    ['link', 'image', 'clean']
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'indent',
  'link', 'image',
  'color', 'background',
  'align',
  'script',
  'direction',
];

export default function RichTextEditor({
  value,
  onChange,
  onCategoryChange,
  onTagsChange,
  category = '',
  tags = '',
  placeholder = 'Write your answer here...',
  readOnly = false
}: RichTextEditorProps) {
  const [editorValue, setEditorValue] = useState(value);
  const [categoryValue, setCategoryValue] = useState(category);
  const [tagsValue, setTagsValue] = useState(tags);
  
  useEffect(() => {
    setEditorValue(value);
  }, [value]);
  
  useEffect(() => {
    setCategoryValue(category);
  }, [category]);
  
  useEffect(() => {
    setTagsValue(tags);
  }, [tags]);
  
  const handleEditorChange = (content: string) => {
    setEditorValue(content);
    onChange(content);
  };
  
  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCategory = e.target.value;
    setCategoryValue(newCategory);
    onCategoryChange && onCategoryChange(newCategory);
  };
  
  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTags = e.target.value;
    setTagsValue(newTags);
    onTagsChange && onTagsChange(newTags);
  };
  
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        {!readOnly && (
          <div className="grid gap-4 mb-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                placeholder="E.g., Theology, Faith, Practice"
                value={categoryValue}
                onChange={handleCategoryChange}
                className="max-w-md"
                disabled={readOnly}
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                placeholder="E.g., prayer, fasting, liturgy"
                value={tagsValue}
                onChange={handleTagsChange}
                className="max-w-md"
                disabled={readOnly}
              />
            </div>
          </div>
        )}
        <div className={`border rounded-md ${readOnly ? 'bg-gray-50' : ''}`}>
          <ReactQuill
            theme="snow"
            value={editorValue}
            onChange={handleEditorChange}
            modules={readOnly ? {} : modules}
            formats={formats}
            placeholder={placeholder}
            readOnly={readOnly}
            className={readOnly ? 'ql-editor-readonly' : ''}
          />
        </div>
      </CardContent>
    </Card>
  );
}