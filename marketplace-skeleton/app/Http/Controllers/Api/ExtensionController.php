<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Extension;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExtensionController extends Controller
{
    /**
     * List all extensions available in the marketplace.
     */
    public function index(): JsonResponse
    {
        $extensions = Extension::query()
            ->orderBy('name')
            ->get()
            ->map(fn (Extension $e) => $this->extensionToArray($e));

        return response()->json(['data' => $extensions]);
    }

    /**
     * Show a single extension by id (primary key) or slug.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $extension = Extension::query()
            ->where('id', $id)
            ->orWhere('slug', $id)
            ->first();

        if (! $extension) {
            return response()->json(['error' => 'Extension not found'], 404);
        }

        return response()->json(['data' => $this->extensionToArray($extension)]);
    }

    /**
     * Download the extension package (zip or single js bundle).
     */
    public function download(Request $request, string $id): StreamedResponse|JsonResponse
    {
        $extension = Extension::query()
            ->where('id', $id)
            ->orWhere('slug', $id)
            ->first();

        if (! $extension) {
            return response()->json(['error' => 'Extension not found'], 404);
        }

        $path = $extension->package_path
            ? storage_path('app/' . $extension->package_path)
            : null;

        if (! $path || ! is_file($path)) {
            if ($extension->download_url) {
                return response()->json([
                    'download_url' => $extension->download_url,
                    'message' => 'Download from external URL',
                ]);
            }
            return response()->json(['error' => 'Package file not available'], 404);
        }

        $filename = $extension->download_filename ?: basename($path);

        return response()->streamDownload(
            fn () => readfile($path),
            $filename,
            [
                'Content-Type' => 'application/zip',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ]
        );
    }

    private function extensionToArray(Extension $e): array
    {
        $baseUrl = url('/');
        $downloadUrl = $e->download_url;
        if (! $downloadUrl && $e->package_path) {
            $downloadUrl = $baseUrl . '/api/extensions/' . $e->id . '/download';
        }

        return [
            'id' => (string) $e->id,
            'slug' => $e->slug,
            'name' => $e->name,
            'description' => $e->description,
            'version' => $e->version,
            'download_url' => $downloadUrl,
            'icon' => $e->icon,
            'author' => $e->author,
            'homepage' => $e->homepage,
            'updated_at' => $e->updated_at?->toIso8601String(),
        ];
    }
}
