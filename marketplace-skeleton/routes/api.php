<?php

use App\Http\Controllers\Api\ExtensionController;
use Illuminate\Support\Facades\Route;

Route::get('extensions', [ExtensionController::class, 'index']);
Route::get('extensions/{id}', [ExtensionController::class, 'show']);
Route::get('extensions/{id}/download', [ExtensionController::class, 'download']);
