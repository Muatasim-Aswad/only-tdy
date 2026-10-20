/** How many tags fit before the row starts counting instead of listing. */
const VISIBLE_TAGS = 2;

export interface TaskMetadataProps {
  readonly projectName?: string | undefined;
  readonly tags: readonly string[];
}

/**
 * The second line of a row: project first, then up to two tags, then a count.
 * Items are separated by space alone — no bullets, dots, or dashes.
 */
export function TaskMetadata({ projectName, tags }: TaskMetadataProps) {
  const hasProject = projectName !== undefined && projectName !== '';
  if (!hasProject && tags.length === 0) {
    return null;
  }

  const shown = tags.slice(0, VISIBLE_TAGS);
  const remaining = tags.length - shown.length;

  return (
    <p className="focus-row__meta flex flex-wrap gap-3 mt-0.5 text-muted text-meta">
      {hasProject ? <span>{projectName}</span> : null}
      {shown.map((tag) => (
        <span key={tag}>#{tag}</span>
      ))}
      {remaining > 0 ? <span>{`+${String(remaining)}`}</span> : null}
    </p>
  );
}
