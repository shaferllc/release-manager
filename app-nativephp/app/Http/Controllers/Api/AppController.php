<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class AppController extends Controller
{
    public function info(): JsonResponse
    {
        return response()->json([
            'name' => config('release-manager.name', 'Release Manager'),
            'version' => config('release-manager.version', '0.1.0'),
        ]);
    }
}
