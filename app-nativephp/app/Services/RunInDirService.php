<?php

namespace App\Services;

use Symfony\Component\Process\Process;

class RunInDirService
{
    /**
     * Run a command in a directory. Returns stdout, stderr, and exit code.
     *
     * @param  array<string>  $args
     * @param  array<string, string>  $env
     * @return array{stdout: string, stderr: string, exitCode: int}
     */
    public function run(string $dirPath, string $command, array $args = [], array $env = [], ?int $timeout = 300): array
    {
        $process = new Process(
            array_merge([$command], $args),
            $dirPath,
            $env ?: null,
            null,
            $timeout
        );

        $process->run();

        return [
            'stdout' => $process->getOutput(),
            'stderr' => $process->getErrorOutput(),
            'exitCode' => $process->getExitCode(),
        ];
    }

    /**
     * Run and return; throw on non-zero exit (for callers that want exception on failure).
     *
     * @param  array<string>  $args
     * @param  array<string, string>  $env
     * @return array{stdout: string, stderr: string}
     */
    public function runOrFail(string $dirPath, string $command, array $args = [], array $env = []): array
    {
        $result = $this->run($dirPath, $command, $args, $env);
        if ($result['exitCode'] !== 0) {
            throw new \RuntimeException($result['stderr'] ?: $result['stdout'] ?: "Exit code {$result['exitCode']}");
        }

        return [
            'stdout' => $result['stdout'],
            'stderr' => $result['stderr'],
        ];
    }
}
