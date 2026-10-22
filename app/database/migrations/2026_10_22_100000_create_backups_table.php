<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * End-to-end encrypted backups. The file itself lives on disk outside the
     * web root (storage/app/backups); this row only says who may read or
     * replace it. The id and token are derived from the user's recovery phrase
     * on their device, and only a hash of the token is kept.
     */
    public function up(): void
    {
        Schema::create('backups', function (Blueprint $table) {
            $table->char('id', 32)->primary();
            $table->char('token_hash', 64);
            $table->unsignedBigInteger('size')->default(0);
            $table->char('sha256', 64)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('backups');
    }
};
