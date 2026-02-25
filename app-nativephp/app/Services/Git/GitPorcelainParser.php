<?php

namespace App\Services\Git;

class GitPorcelainParser
{
    /**
     * True if the two-character status indicates an unmerged (conflicted) file.
     */
    public static function isUnmergedStatus(string $status): bool
    {
        return strlen($status) >= 2 && (bool) preg_match('/^[UAD][UAD]$/', substr($status, 0, 2));
    }

    /**
     * Parse a single git status --porcelain line.
     *
     * @return array{status: string, filePath: string, isUntracked: bool, isUnmerged: bool}
     */
    public static function parseLine(string $line): array
    {
        $status = strlen($line) >= 2 ? substr($line, 0, 2) : '';
        $rest = strlen($line) > 2 ? trim(substr($line, 2)) : $line;
        $filePath = str_contains($rest, ' -> ') ? trim(explode(' -> ', $rest)[1] ?? $rest) : $rest;
        $isUntracked = $status === '??' || (strlen($status) > 0 && $status[0] === '?');
        $isUnmerged = self::isUnmergedStatus($status);

        return [
            'status' => $status,
            'filePath' => $filePath,
            'isUntracked' => $isUntracked,
            'isUnmerged' => $isUnmerged,
        ];
    }

    /**
     * Parse full porcelain output.
     *
     * @return array{lines: array<int, array{status: string, filePath: string, isUntracked: bool, isUnmerged: bool}>, conflictCount: int}
     */
    public static function parse(string $porcelain): array
    {
        $raw = is_string($porcelain) ? trim($porcelain) : '';
        $lineStrings = $raw !== '' ? preg_split('/\r?\n/', $raw, -1, PREG_SPLIT_NO_EMPTY) : [];
        $lines = array_map([self::class, 'parseLine'], $lineStrings);
        $conflictCount = count(array_filter($lines, fn ($l) => $l['isUnmerged']));

        return ['lines' => array_values($lines), 'conflictCount' => $conflictCount];
    }
}
