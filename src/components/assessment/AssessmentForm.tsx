// src/components/assessment/AssessmentForm.tsx

'use client';

import { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface AnalysisResponse {
  correctness_score: number;
  reasoning_quality_score: number;
  feedback: string;
  explanation: string;
  misconceptions: string[];
  next_steps: string[];
}

interface FormState {
  question: string;
  answer: string;
  context: string;
  loading: boolean;
  error: string | null;
  analysis: AnalysisResponse | null;
  submitted: boolean;
}

export default function AssessmentForm() {
  const [formState, setFormState] = useState<FormState>({
    question: '',
    answer: '',
    context: '',
    loading: false,
    error: null,
    analysis: null,
    submitted: false,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
      error: null, // پاک‌سازی خطا هنگام تغییر
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // تحقق از ورودی‌ها
    if (!formState.question.trim()) {
      setFormState((prev) => ({
        ...prev,
        error: 'لطفاً سوال را وارد کنید',
      }));
      return;
    }

    if (!formState.answer.trim()) {
      setFormState((prev) => ({
        ...prev,
        error: 'لطفاً پاسخ را وارد کنید',
      }));
      return;
    }

    setFormState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      submitted: false,
    }));

    try {
      const response = await fetch('/api/assessment/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: formState.question,
          userAnswer: formState.answer,
          context: formState.context || undefined,
          language: 'fa',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || 'خطای پردازش درخواست'
        );
      }

      const data = await response.json();

      setFormState((prev) => ({
        ...prev,
        loading: false,
        analysis: data.analysis,
        submitted: true,
        error: null,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'خطای نامشخص رخ داد';

      setFormState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
        submitted: false,
      }));
    }
  };

  const resetForm = () => {
    setFormState({
      question: '',
      answer: '',
      context: '',
      loading: false,
      error: null,
      analysis: null,
      submitted: false,
    });
  };

  // نمایش نتیجه
  if (formState.submitted && formState.analysis) {
    const analysis = formState.analysis;
    const correctnessColor =
      analysis.correctness_score >= 80
        ? 'text-green-500'
        : analysis.correctness_score >= 50
          ? 'text-yellow-500'
          : 'text-red-500';

    return (
      <div className="space-y-6 rtl">
        {/* بالای صفحه */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-200">
                تحلیل تکمیل شد
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                پاسخ شما تجزیه و تحلیل گردید
              </p>
            </div>
          </div>
        </div>

        {/* نمرات */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* نمره درستی */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              نمره درستی
            </h4>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold">
                <span className={correctnessColor}>
                  {analysis.correctness_score}
                </span>
                <span className="text-gray-400 text-lg">/100</span>
              </div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      analysis.correctness_score >= 80
                        ? 'bg-green-500'
                        : analysis.correctness_score >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${analysis.correctness_score}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* نمره استدلال */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              کیفیت استدلال
            </h4>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold">
                <span className={correctnessColor}>
                  {analysis.reasoning_quality_score}
                </span>
                <span className="text-gray-400 text-lg">/100</span>
              </div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      analysis.reasoning_quality_score >= 80
                        ? 'bg-green-500'
                        : analysis.reasoning_quality_score >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{
                      width: `${analysis.reasoning_quality_score}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* بازخورد */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            بازخورد
          </h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {analysis.feedback}
          </p>
        </div>

        {/* توضیح تفصیلی */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            توضیح تفصیلی
          </h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {analysis.explanation}
          </p>
        </div>

        {/* اشتباهات مفهومی */}
        {analysis.misconceptions.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
            <h4 className="font-semibold text-orange-900 dark:text-orange-200 mb-3">
              ⚠️ اشتباهات مفهومی
            </h4>
            <ul className="space-y-2">
              {analysis.misconceptions.map((misconception, index) => (
                <li
                  key={index}
                  className="text-sm text-orange-800 dark:text-orange-300 flex gap-2"
                >
                  <span className="font-bold">•</span>
                  <span>{misconception}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* قدم‌های بعدی */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <h4 className="font-semibold text-green-900 dark:text-green-200 mb-3">
            ✨ قدم‌های بعدی
          </h4>
          <ul className="space-y-2">
            {analysis.next_steps.map((step, index) => (
              <li
                key={index}
                className="text-sm text-green-800 dark:text-green-300 flex gap-2"
              >
                <span className="font-bold">{index + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* دکمه بازگشت */}
        <button
          onClick={resetForm}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          ارزیابی جدید
        </button>
      </div>
    );
  }

  // فرم ورودی
  return (
    <form onSubmit={handleSubmit} className="space-y-4 rtl">
      {/* خطا */}
      {formState.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-300">
            {formState.error}
          </p>
        </div>
      )}

      {/* سوال */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          سوال
        </label>
        <input
          type="text"
          name="question"
          value={formState.question}
          onChange={handleChange}
          placeholder="سوال را وارد کنید..."
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={formState.loading}
        />
      </div>

      {/* متن پیشینه (اختیاری) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          متن پیشینه (اختیاری)
        </label>
        <textarea
          name="context"
          value={formState.context}
          onChange={handleChange}
          placeholder="متن یا منبعی که دانشجو باید به آن توجه کند..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          disabled={formState.loading}
        />
      </div>

      {/* پاسخ */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          پاسخ دانشجو
        </label>
        <textarea
          name="answer"
          value={formState.answer}
          onChange={handleChange}
          placeholder="پاسخ دانشجو را وارد کنید..."
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          disabled={formState.loading}
        />
      </div>

      {/* دکمه ارسال */}
      <button
        type="submit"
        disabled={formState.loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {formState.loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {formState.loading ? 'در حال تحلیل...' : 'ارسال برای ارزیابی'}
      </button>

      {/* توضیح */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        پاسخ شما با هوش مصنوعی تحلیل و بازخورد دقیق ارائه می‌شود
      </p>
    </form>
  );
}
