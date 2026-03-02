<?php

use App\Http\Controllers\ReleaseController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('splash');
});

Route::get('/download', [ReleaseController::class, 'download'])->name('download');
Route::get('/releases', [ReleaseController::class, 'releases'])->name('releases');
