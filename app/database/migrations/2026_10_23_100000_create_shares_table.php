<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Read-only attorney shares. The bundle is encrypted in the browser with a
     * key that travels only in the link's #fragment, so the server stores
     * ciphertext it cannot open. Views are logged (time and a coarse device
     * description) so the owner can see when the link was used.
     */
    public function up(): void
    {
        Schema::create('shares', function (Blueprint $table) {
            $table->char('id', 32)->primary();
            $table->char('token_hash', 64);
            $table->unsignedBigInteger('size')->default(0);
            $table->char('sha256', 64)->nullable();
            $table->timestamp('expires_at')->index();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
        });

        Schema::create('share_views', function (Blueprint $table) {
            $table->id();
            $table->char('share_id', 32)->index();
            $table->timestamp('viewed_at');
            $table->string('device', 60);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('share_views');
        Schema::dropIfExists('shares');
    }
};
