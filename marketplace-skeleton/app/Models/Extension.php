<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Extension extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'description',
        'version',
        'package_path',
        'download_url',
        'download_filename',
        'icon',
        'author',
        'homepage',
    ];

    protected $casts = [
        'updated_at' => 'datetime',
    ];
}
