<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('requirement_actuals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cell_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('model_requirement_id')->constrained()->cascadeOnDelete();
            $table->integer('qty_actual')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('requirement_actuals');
    }
};
