<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('extensions', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('version', 32)->nullable();
            $table->string('package_path')->nullable()->comment('Path under storage/app, e.g. public/extensions/foo-1.0.0.zip');
            $table->string('download_url')->nullable()->comment('External URL if package is hosted elsewhere');
            $table->string('download_filename')->nullable();
            $table->string('icon')->nullable();
            $table->string('author')->nullable();
            $table->string('homepage')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('extensions');
    }
};
