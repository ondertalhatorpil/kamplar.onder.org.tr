export default function LoadingSpinner({ size = 'md', center = false }) {
  const sizes = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };
  const spinner = (
    <div className={`animate-spin rounded-full border-b-2 border-primary-700 ${sizes[size]}`} />
  );
  if (center) return <div className="flex justify-center items-center py-12">{spinner}</div>;
  return spinner;
}
